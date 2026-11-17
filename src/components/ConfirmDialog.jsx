import { createPortal } from 'react-dom'
import { useEffect } from 'react'

/** 危险操作确认 */
export default function ConfirmDialog({ open, title, message, confirmText = '确定', cancelText = '取消', danger, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div className="modal-root" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal-card">
        <h3 className="modal-title">{title}</h3>
        {message ? <p className="modal-message">{message}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
