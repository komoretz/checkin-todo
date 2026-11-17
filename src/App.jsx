import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DateNav from './components/DateNav'
import TodoList from './components/TodoList'
import Fab from './components/Fab'
import TodoEditor from './components/TodoEditor'
import SettingsSheet from './components/SettingsSheet'
import ConfirmDialog from './components/ConfirmDialog'
import { useStore, useThemeEffect, useToday } from './hooks/useStore'
import { addDays, formatMonthDay } from './lib/date'
import { draftToFields, isTodoActiveOn, listForDate, progressOf } from './lib/todos'

export default function App() {
  const {
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
  } = useStore()

  const today = useToday()
  const [date, setDate] = useState(today)

  useThemeEffect(theme)

  // 跨零点时：如果用户正停在“今天”，自动跟随到新的今天
  const lastTodayRef = useRef(today)
  useEffect(() => {
    if (lastTodayRef.current !== today) {
      setDate((d) => (d === lastTodayRef.current ? today : d))
      lastTodayRef.current = today
    }
  }, [today])

  const [editor, setEditor] = useState({ open: false, todo: null })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  /* ---------- 安装提示 ---------- */
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const onInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  /* ---------- 当日数据 ---------- */
  const entries = useMemo(() => listForDate(todos, checkins, date), [todos, checkins, date])
  const progress = useMemo(() => progressOf(entries), [entries])
  const isToday = date === today

  /* ---------- 交互 ---------- */
  const handleToggle = useCallback(
    (todoId, completed) => {
      toggleCheck(todoId, date, completed)
      if (completed && typeof navigator.vibrate === 'function') navigator.vibrate(8)
    },
    [toggleCheck, date]
  )

  const handleSave = (draft) => {
    const fields = draftToFields(draft)
    if (editor.todo) {
      updateTodo(editor.todo.id, fields)
      setEditor({ open: false, todo: null })
      showToast('已保存')
      return
    }
    const created = addTodo(fields)
    setEditor({ open: false, todo: null })
    if (!isTodoActiveOn(created, date)) {
      const target = created.type === 'specific' ? created.specificDate : created.startDate
      if (target) {
        setDate(target)
        showToast(`已添加，已跳到 ${formatMonthDay(target)}`)
        return
      }
    }
    showToast('已添加')
  }

  const handleDelete = () => {
    if (!pendingDelete) return
    removeTodo(pendingDelete)
    setPendingDelete(null)
    setEditor({ open: false, todo: null })
    showToast('已删除')
  }

  const handleClear = () => {
    clearAll()
    setConfirmClear(false)
    setSettingsOpen(false)
    setEditor({ open: false, todo: null })
    showToast('数据已清空')
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const choice = await installPrompt.userChoice.catch(() => null)
    if (choice?.outcome === 'accepted') showToast('正在添加到桌面…')
    setInstallPrompt(null)
  }

  return (
    <div className="app">
      <DateNav
        date={date}
        isToday={isToday}
        progress={progress}
        onPrev={() => setDate((d) => addDays(d, -1))}
        onNext={() => setDate((d) => addDays(d, 1))}
        onToday={() => setDate(today)}
        onChangeDate={(d) => setDate(d)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="content">
        <TodoList
          entries={entries}
          date={date}
          isToday={isToday}
          onToggle={handleToggle}
          onEdit={(todo) => setEditor({ open: true, todo })}
        />
      </main>

      <Fab onClick={() => setEditor({ open: true, todo: null })} />

      <TodoEditor
        open={editor.open}
        todo={editor.todo}
        defaultDate={date}
        onClose={() => setEditor({ open: false, todo: null })}
        onSave={handleSave}
        onDelete={(id) => setPendingDelete(id)}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onChangeTheme={setTheme}
        stats={stats}
        onClearData={() => setConfirmClear(true)}
        installPrompt={installPrompt}
        onInstall={handleInstall}
      />

      <ConfirmDialog
        open={confirmClear}
        title="清空全部数据？"
        message="待办和所有打卡记录都会被删除，且无法恢复。"
        confirmText="清空"
        danger
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除这个待办？"
        message="它的历史打卡记录也会一起删除。"
        confirmText="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <div className={`toast ${toast ? 'is-show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
