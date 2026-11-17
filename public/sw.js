/* 打卡待办 - Service Worker
 * 策略：
 *  - 页面导航：network-first，断网回退到缓存的 index.html（保证离线打开）
 *  - 静态资源：stale-while-revalidate（先给缓存，后台更新）
 * 所有路径基于「本文件所在目录」计算，因此根目录、GitHub Pages 子目录（/repo/）都能正常工作。
 * 注意：业务数据在 localStorage，不经过网络，无需同步。
 */
const VERSION = 'v1.1.0'
const SHELL_CACHE = `shell-${VERSION}`
const ASSET_CACHE = `asset-${VERSION}`

// sw.js 位于应用根目录，其 parent 即为应用 base（如 https://x.github.io/checkin-todo/）
const BASE = new URL('./', self.location.href)
const url = (p) => new URL(p, BASE).href

const PRECACHE = [
  url('./'),
  url('index.html'),
  url('manifest.webmanifest'),
  url('icons/icon-192.png'),
  url('icons/icon-512.png'),
  url('icons/apple-touch-icon.png'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // 逐个添加，单个失败不影响整体安装
      await Promise.all(
        PRECACHE.map((u) =>
          cache.add(new Request(u, { cache: 'reload' })).catch(() => {})
        )
      )
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const u = new URL(request.url)
  if (u.origin !== self.location.origin) return
  if (!u.pathname.startsWith(BASE.pathname)) return

  // 1. 页面导航
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(SHELL_CACHE)
          cache.put(url('index.html'), fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(SHELL_CACHE)
          return (
            (await cache.match(url('index.html'))) ||
            (await cache.match(url('./'))) ||
            new Response('离线中，请联网后再试。', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }
      })()
    )
    return
  }

  // 2. 静态资源
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE)
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(request, res.clone())
          }
          return res
        })
        .catch(() => null)

      return cached || (await network) || Response.error()
    })()
  )
})
