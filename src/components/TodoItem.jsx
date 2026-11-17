import { TYPE_DAILY, TYPE_LABEL } from '../lib/todos'
import { formatMonthDay } from '../lib/date'

/** 单条待办：勾选框 + 标题 + 类型标签 + 编辑入口 */
export default function TodoItem({ todo, completed, date, onToggle, onEdit }) {
  const isDaily = todo.type === TYPE_DAILY
  const tagText = TYPE_LABEL[todo.type] || TYPE_LABEL[TYPE_DAILY]

  // 副信息：日程范围 / 备注（单次待办与当前查看日期相同则不重复显示日期）
  let meta = ''
  if (isDaily && todo.endDate) meta = `至 ${formatMonthDay(todo.endDate)}`
  if (!isDaily && todo.specificDate && todo.specificDate !== date) {
    meta = formatMonthDay(todo.specificDate)
  }

  return (
    <li className="todo" data-done={completed ? 'true' : 'false'}>
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={completed}
        aria-label={`${completed ? '取消完成' : '标记完成'}：${todo.title}`}
        onClick={() => onToggle(!completed)}
      >
        <svg className="check-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.8l4.2 4.2L19 7.2" />
        </svg>
      </button>

      <button type="button" className="todo-main" onClick={onEdit} aria-label={`编辑：${todo.title}`}>
        <span className="todo-title">{todo.title}</span>
        <span className="todo-sub">
          <span className={`tag ${isDaily ? 'tag-daily' : 'tag-once'}`}>{tagText}</span>
          {meta ? <span className="todo-meta">{meta}</span> : null}
          {todo.note ? <span className="todo-note">{todo.note}</span> : null}
        </span>
      </button>

      <button type="button" className="row-edit" onClick={onEdit} aria-label={`编辑 ${todo.title}`}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5V20z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  )
}
