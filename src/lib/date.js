/* 日期工具：全部使用本地时区的 'YYYY-MM-DD' 字符串，
 * 字符串可直接做字典序比较，避免时区与夏令时问题。 */

export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** Date -> 'YYYY-MM-DD'（本地时区） */
export function toDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' -> 本地 0 点的 Date */
export function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 用 UTC 归一化计算天数差，避免夏令时误差 */
export function diffDays(a, b) {
  const ua = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))
  const ub = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))
  return Math.round((ub - ua) / 86400000)
}

export function addDays(dateStr, n) {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function todayStr() {
  return toDateStr(new Date())
}

/** 11月17日 */
export function formatMonthDay(dateStr) {
  const d = parseDateStr(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 2026年11月17日 */
export function formatFullDate(dateStr) {
  const d = parseDateStr(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function weekdayOf(dateStr) {
  return WEEKDAYS[parseDateStr(dateStr).getDay()]
}

/** 今天 / 明天 / 昨天 / 前天 …，其他返回空串 */
export function relativeLabel(dateStr, base = todayStr()) {
  const d = diffDays(base, dateStr)
  if (d === 0) return '今天'
  if (d === 1) return '明天'
  if (d === 2) return '后天'
  if (d === -1) return '昨天'
  if (d === -2) return '前天'
  return ''
}

/** 短日期：今天显示“今天”，否则 11/17 */
export function shortDate(dateStr, base = todayStr()) {
  const rel = relativeLabel(dateStr, base)
  if (rel) return rel
  const d = parseDateStr(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
