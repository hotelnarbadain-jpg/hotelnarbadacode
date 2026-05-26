import Modal from './Modal';

export default function ConfirmDialog({ open, title = 'Confirm action', message, onClose, onConfirm, confirmText = 'Delete', confirmClass = 'btn-danger' }) {
  return (
    <Modal open={open} title={title} onClose={onClose} width="420px">
      <p className="text-[13px] leading-6 text-brand-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className={confirmClass} onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  );
}
