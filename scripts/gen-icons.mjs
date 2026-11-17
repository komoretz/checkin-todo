/**
 * 生成 PWA 图标（纯 Node，无第三方依赖）
 * 输出：icon-192.png、icon-512.png、icon-maskable-512.png、apple-touch-icon.png
 * 用法：npm run icons
 */
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

/* ---------- PNG 编码 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePNG(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- 绘制 ---------- */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  const inside = Math.min(Math.max(qx, qy), 0)
  return outside + inside - r
}

function sdSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const t = clamp01((wx * vx + wy * vy) / (vx * vx + vy * vy))
  return Math.hypot(wx - vx * t, wy - vy * t)
}

const lerp = (a, b, t) => a + (b - a) * t

function drawIcon(size, { maskable = false, bleed = false } = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const s = size
  const full = maskable || bleed
  const pad = full ? 0 : s * 0.06 // 普通图标留白，满铺版本不留
  const radius = full ? 0 : s * 0.235
  const aa = 1.2 // 抗锯齿宽度（像素）

  // 勾的三段（相对尺寸，maskable 时缩小以适配安全区）
  const k = maskable ? 0.34 : 0.44
  const cx = s / 2
  const cy = s / 2
  const p1 = [cx - 0.42 * s * k * 1.55, cy + 0.02 * s * k * 1.55]
  const p2 = [cx - 0.1 * s * k * 1.55, cy + 0.34 * s * k * 1.55]
  const p3 = [cx + 0.46 * s * k * 1.55, cy - 0.34 * s * k * 1.55]
  const stroke = s * 0.075 * (maskable ? 0.82 : 1)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const i = (y * size + x) * 4

      // 背景：圆角矩形 + 斜向渐变
      const d = sdRoundRect(px, py, s / 2, s / 2, s / 2 - pad, s / 2 - pad, radius)
      const bgA = clamp01(0.5 - d / aa)
      if (bgA <= 0) {
        buf[i + 3] = 0
        continue
      }
      const t = clamp01((px / s) * 0.45 + (py / s) * 0.55)
      const r0 = lerp(84, 124, t)
      const g0 = lerp(124, 92, t)
      const b0 = lerp(255, 255, t)

      // 勾
      const dCheck = Math.min(
        sdSegment(px, py, p1[0], p1[1], p2[0], p2[1]),
        sdSegment(px, py, p2[0], p2[1], p3[0], p3[1])
      )
      const checkA = clamp01(0.5 - (dCheck - stroke / 2) / aa)

      const r = lerp(r0, 255, checkA)
      const g = lerp(g0, 255, checkA)
      const b = lerp(b0, 255, checkA)

      buf[i] = Math.round(r)
      buf[i + 1] = Math.round(g)
      buf[i + 2] = Math.round(b)
      buf[i + 3] = Math.round(bgA * 255)
    }
  }
  return encodePNG(size, size, buf)
}

/* ---------- 输出 ---------- */
const outDir = path.resolve(process.cwd(), 'public/icons')
fs.mkdirSync(outDir, { recursive: true })

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
]

for (const [name, size, opts] of targets) {
  fs.writeFileSync(path.join(outDir, name), drawIcon(size, opts))
  console.log('✓', name, `${size}x${size}`)
}

// 安卓/iOS 安装包图标源图：满铺无透明，交给 @capacitor/assets 生成各 dpi
const assetsDir = path.resolve(process.cwd(), 'assets')
fs.mkdirSync(assetsDir, { recursive: true })
fs.writeFileSync(path.join(assetsDir, 'icon.png'), drawIcon(1024, { bleed: true }))
console.log('✓ assets/icon.png 1024x1024')
