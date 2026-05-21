import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm'} width="max-w-sm">
      <div className="flex gap-3 mb-5">
        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-navy-600 dark:text-navy-300 leading-relaxed">
          {message || 'This action cannot be undone. Continue?'}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="
            px-4 py-2 text-sm rounded-md font-medium
            text-navy-600 dark:text-navy-300
            bg-navy-100 dark:bg-navy-800
            hover:bg-navy-200 dark:hover:bg-navy-700
            transition-colors
          "
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="
            px-4 py-2 text-sm rounded-md font-medium
            text-white bg-red-600 hover:bg-red-700
            transition-colors
          "
        >
          Delete
        </button>
      </div>
    </Modal>
  )
}
