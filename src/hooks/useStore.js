import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyCheck,
  clearAllData,
  countCheckins,
  loadCheckins,
  loadTheme,
  loadTodos,
  removeCheckinsOf,
  saveCheckins,
  saveTheme,
  saveTodos,
} from '../lib/storage'
import { todayStr } from '../lib/date'

/** 让“今天”随系统时间自动滚动（跨零点后自动切到新的一天） */
export function useToday() {
  const [today, setToday] = useState(todayStr)
  useEffect(() => {
    const tick = () => setToday(todayStr())
    const timer = setInterval(tick, 30 * 1000)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', tick)
    }
  }, [])
  return today
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

/**
 * 应用状态中枢：todos / checkins / theme
 * 任何变更都同步写入 localStorage。
 */
export function useStore() {
  const [todos, setTodos] = useState(() => loadTodos())
  const [checkins, setCheckins] = useState(() => loadCheckins())
  const [theme, setThemeState] = useState(() => loadTheme())

  // 首次挂载时把初始数据补齐落盘（例如清理脏数据后）
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      saveTodos(todos)
      saveCheckins(checkins)
    }
  }, [todos, checkins])

  const persistTodos = useCallback((updater) => {
    setTodos((prev) => {
      const next = updater(prev)
      saveTodos(next)
      return next
    })
  }, [])

  const persistCheckins = useCallback((updater) => {
    setCheckins((prev) => {
      const next = updater(prev)
      saveCheckins(next)
      return next
    })
  }, [])

  const addTodo = useCallback(
    (fields) => {
      const todo = { id: uid(), ...fields, createdAt: Date.now() }
      persistTodos((prev) => [...prev, todo])
      return todo
    },
    [persistTodos]
  )

  const updateTodo = useCallback(
    (id, fields) => {
      persistTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)))
    },
    [persistTodos]
  )

  const removeTodo = useCallback(
    (id) => {
      persistTodos((prev) => prev.filter((t) => t.id !== id))
      persistCheckins((prev) => removeCheckinsOf(prev, id))
    },
    [persistTodos, persistCheckins]
  )

  const toggleCheck = useCallback(
    (todoId, date, completed) => {
      persistCheckins((prev) => applyCheck(prev, todoId, date, completed))
    },
    [persistCheckins]
  )

  const clearAll = useCallback(() => {
    clearAllData()
    setTodos([])
    setCheckins({})
  }, [])

  const setTheme = useCallback((value) => {
    setThemeState(value)
    saveTheme(value)
  }, [])

  const stats = useMemo(
    () => ({ todoCount: todos.length, checkinCount: countCheckins(checkins) }),
    [todos, checkins]
  )

  return {
    todos,
    checkins,
    theme,
    stats,
    addTodo,
    updateTodo,
    removeTodo,
    toggleCheck,
    clearAll,
    setTheme,
  }
}

/** 主题应用：system 跟随系统，其余强制 */
export function useThemeEffect(theme) {
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (mql.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0e1014' : '#f5f6f8')
    }
    apply()
    if (theme !== 'system') return
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])
}
