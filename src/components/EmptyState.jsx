import { formatFullDate } from '../lib/date'

/** 空状态 */
export default function EmptyState({ date, isToday }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <rect x="10" y="14" width="44" height="40" rx="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 5" />
          <path d="M22 34l6 6 14-14" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
        </svg>
      </div>
      <p className="empty-title">{isToday ? '今天还没有待办' : '这一天没有安排'}</p>
      <p className="empty-desc">
        {isToday ? '点击右下角 + 新建一个，从一件小事开始。' : '可以切换到今天，或为这天新建一条待办。'}
      </p>
      <span className="empty-date">{formatFullDate(date)}</span>
    </div>
  )
}
