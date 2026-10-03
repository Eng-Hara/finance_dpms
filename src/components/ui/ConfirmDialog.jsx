import Modal from './Modal'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className={`rounded-full p-2 ${variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'}`}>
          <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <p className="text-sm text-slate-600 pt-1.5">{message}</p>
      </div>
    </Modal>
  )
}