/** 悬浮添加按钮 */
export default function Fab({ onClick }) {
  return (
    <div className="fab-wrap">
      <button type="button" className="fab" onClick={onClick} aria-label="新建待办">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
