import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';

export const notifySuccess = (message = 'User updated successfully') => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} flex items-center gap-3 rounded-2xl border border-brand-border bg-white px-5 py-4 shadow-[0_10px_40px_rgba(15,23,42,0.12)]`}>
        <div className="grid h-7 w-7 place-content-center rounded-full bg-green-500 text-white">
          <FontAwesomeIcon icon={faCircleCheck} className="text-[12px]" />
        </div>
        <span className="text-[13px] font-medium text-brand-text">{message}</span>
      </div>
    ),
    { duration: 2500, position: 'top-center' }
  );
};

export const notifyError = (message = 'An error occurred') => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} flex items-center gap-3 rounded-2xl border border-brand-border bg-white px-5 py-4 shadow-[0_10px_40px_rgba(15,23,42,0.12)]`}>
        <div className="grid h-7 w-7 place-content-center rounded-full bg-rose-500 text-white">
          <FontAwesomeIcon icon={faCircleXmark} className="text-[12px]" />
        </div>
        <span className="text-[13px] font-medium text-brand-text">{message}</span>
      </div>
    ),
    { duration: 3500, position: 'top-center' }
  );
};
