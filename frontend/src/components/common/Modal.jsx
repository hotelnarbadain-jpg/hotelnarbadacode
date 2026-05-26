import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export default function Modal({ open, title, children, onClose, width = '760px' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-5">
          <h3 className="text-[18px] font-extrabold uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-content-center rounded-full border border-brand-border text-brand-muted transition hover:border-brand-text hover:text-brand-text">
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </>
  );
}
