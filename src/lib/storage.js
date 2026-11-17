/* 本地存储层（localStorage）
 * 使用固定的 key 前缀 + 版本号，方便未来迁移。
 * - todos:    Todo[]                   数组，量小、整体读写简单
 * - checkins: { 'todoId::date': CheckIn } 对象哈希，按天 O(1) 读写
 * - theme:    'system' | 'light' | 'dark'
 */

const KEY_TODOS = 'checkin.todos.v1'
const KEY_CHECKINS = 'checkin.checkins.v1'
const KEY_THEME = 'checkin.theme.v1'

/** 打卡记录主键：同一待办的每一天独立一条 */
export const checkinKey = (todoId, date) => `${todoId}::${date}`

/* ---------------- 通用 ---------------- */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const val = JSON.parse(raw)
    return val ?? fallback
  } catch (err) {
    console.warn('[storage] 读取失败', key, err)
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    // 隐私模式 / 存储写满
    console.warn('[storage] 写入失败', key, err)
  }
}

/* ---------------- Todo ---------------- */
export function loadTodos() {
  const list = readJSON(KEY_TODOS, [])
  return Array.isArray(list) ? list.filter((t) => t && t.id) : []
}

export function saveTodos(todos) {
  writeJSON(KEY_TODOS, todos)
}

/* ---------------- CheckIn ---------------- */
export function loadCheckins() {
  const map = readJSON(KEY_CHECKINS, {})
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {}
}

export function saveCheckins(checkins) {
  writeJSON(KEY_CHECKINS, checkins)
}

export function isChecked(checkins, todoId, date) {
  return !!checkins[checkinKey(todoId, date)]?.completed
}

/** 返回新的 checkins 对象；取消勾选时直接删除记录，保持数据干净 */
export function applyCheck(checkins, todoId, date, completed) {
  const key = checkinKey(todoId, date)
  const next = { ...checkins }
  if (completed) {
    next[key] = { todoId, date, completed: true }
  } else {
    delete next[key]
  }
  return next
}

/** 删除某个待办的全部打卡记录 */
export function removeCheckinsOf(checkins, todoId) {
  const next = { ...checkins }
  for (const key of Object.keys(next)) {
    if (next[key]?.todoId === todoId) delete next[key]
  }
  return next
}

/* ---------------- 主题 ---------------- */
export function loadTheme() {
  const t = localStorage.getItem(KEY_THEME)
  return ['system', 'light', 'dark'].includes(t) ? t : 'system'
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY_THEME, theme)
  } catch {}
}

/* ---------------- 维护 ---------------- */
export function clearAllData() {
  try {
    localStorage.removeItem(KEY_TODOS)
    localStorage.removeItem(KEY_CHECKINS)
  } catch {}
}

/** 统计：打卡记录条数 */
export function countCheckins(checkins) {
  return Object.keys(checkins).length
}
