import { useRef } from 'react'
import { formatMonthDay, relativeLabel, weekdayOf } from '../lib/date'

/** 顶部：日期切换 + 完成进度 + 回到今天 */
export default function DateNav({
  date,
  isToday,
  progress,
  onPrev,
  onNext,
  onToday,
  onChangeDate,
  onOpenSettings,
}) {
  const pickerRef = useRef(null)
  const rel = relativeLabel(date)

  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker()
        return
      } catch {
        /* 部分浏览器需用户手势，降级为 focus */
      }
    }
    el.focus()
    el.click()
  }

  return (
    <header className="app-header">
      <div className="header-top">
        <span className="brand">打卡待办</span>
        <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="设置">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7.5h8M18.5 7.5H20M4 16.5h2.5M12 16.5h8" />
              <circle cx="15.2" cy="7.5" r="2.3" />
              <circle cx="9.2" cy="16.5" r="2.3" />
            </g>
          </svg>
        </button>
      </div>

      <div className="date-bar">
        <button type="button" className="nav-btn" onClick={onPrev} aria-label="前一天">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button type="button" className="date-center" onClick={openPicker} aria-label="选择日期">
          <span className="date-main">{formatMonthDay(date)}</span>
          <span className="date-sub">
            {weekdayOf(date)}
            {rel ? <em className="date-rel">{rel}</em> : null}
          </span>
        </button>

        <button type="button" className="nav-btn" onClick={onNext} aria-label="后一天">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <input
        ref={pickerRef}
        className="hidden-date"
        type="date"
        value={date}
        onChange={(e) => e.target.value && onChangeDate(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="progress-card">
        <div className="progress-text">
          <span className="progress-label">完成进度</span>
          <span className="progress-num">
            <b>{progress.done}</b> / {progress.total}
          </span>
        </div>
        <div className="track" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <div
            className="fill"
            data-full={progress.total > 0 && progress.done === progress.total ? 'true' : 'false'}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="progress-foot">
          <span>
            {progress.total === 0
              ? '今天没有安排'
              : progress.done === progress.total
                ? '全部完成，做得好'
                : `还剩 ${progress.total - progress.done} 项`}
          </span>
          {!isToday ? (
            <button type="button" className="link-btn" onClick={onToday}>
              回到今天
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
