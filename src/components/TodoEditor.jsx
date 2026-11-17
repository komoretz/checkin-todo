import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet'
import {
  TYPE_DAILY,
  TYPE_SPECIFIC,
  TYPE_FULL_LABEL,
  emptyDraft,
  toDraft,
  validateDraft,
} from '../lib/todos'
import { todayStr } from '../lib/date'

/**
 * 新建 / 编辑待办
 * props: { open, todo|null, defaultDate, onClose, onSave(fields), onDelete(id) }
 */
export default function TodoEditor({ open, todo, defaultDate, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => emptyDraft(defaultDate || todayStr()))
  const [error, setError] = useState('')
  const titleRef = useRef(null)

  // 每次打开时重置表单
  useEffect(() => {
    if (!open) return
    setDraft(todo ? toDraft(todo) : emptyDraft(defaultDate || todayStr()))
    setError('')
    const timer = setTimeout(() => titleRef.current?.focus(), 260)
    return () => clearTimeout(timer)
  }, [open, todo, defaultDate])

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }))
    if (error) setError('')
  }

  const submit = (e) => {
    e?.preventDefault()
    const msg = validateDraft(draft)
    if (msg) {
      setError(msg)
      return
    }
    onSave(draft)
  }

  const isDaily = draft.type === TYPE_DAILY

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={todo ? '编辑待办' : '新建待办'}
      footer={
        <div className="editor-actions">
          {todo ? (
            <button type="button" className="btn btn-ghost-danger" onClick={() => onDelete(todo.id)}>
              删除
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={submit}>
            {todo ? '保存' : '添加'}
          </button>
        </div>
      }
    >
      <form className="form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="todo-title">
            标题 <span className="required">必填</span>
          </label>
          <input
            id="todo-title"
            ref={titleRef}
            className="input"
            type="text"
            value={draft.title}
            maxLength={60}
            placeholder="例如：喝够 8 杯水"
            onChange={(e) => set({ title: e.target.value })}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <span className="field-label">类型</span>
          <div className="segment" role="tablist" aria-label="待办类型">
            {[TYPE_DAILY, TYPE_SPECIFIC].map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={draft.type === type}
                className={`segment-item ${draft.type === type ? 'is-active' : ''}`}
                onClick={() => set({ type })}
              >
                {TYPE_FULL_LABEL[type]}
              </button>
            ))}
          </div>
          <p className="field-hint">
            {isDaily
              ? '从开始日期起每天出现，可设置结束日期。'
              : '只在指定的那一天出现，适合一次性安排。'}
          </p>
        </div>

        {isDaily ? (
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="start-date">
                开始日期
              </label>
              <input
                id="start-date"
                className="input"
                type="date"
                value={draft.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="end-date">
                结束日期 <span className="optional">可留空</span>
              </label>
              <input
                id="end-date"
                className="input"
                type="date"
                value={draft.endDate}
                min={draft.startDate || undefined}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="specific-date">
              日期
            </label>
            <input
              id="specific-date"
              className="input"
              type="date"
              value={draft.specificDate}
              onChange={(e) => set({ specificDate: e.target.value })}
            />
          </div>
        )}

        {isDaily && draft.endDate ? (
          <button type="button" className="link-btn" onClick={() => set({ endDate: '' })}>
            清除结束日期（长期循环）
          </button>
        ) : null}

        <div className="field">
          <label className="field-label" htmlFor="todo-note">
            备注 <span className="optional">选填</span>
          </label>
          <textarea
            id="todo-note"
            className="input textarea"
            rows={3}
            value={draft.note}
            maxLength={200}
            placeholder="补充说明，例如：睡前完成"
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  )
}
