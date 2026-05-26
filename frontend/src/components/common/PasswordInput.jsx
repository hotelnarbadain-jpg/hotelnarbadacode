import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

/**
 * PasswordInput — a drop-in replacement for <input type="password">
 * with a toggle eye button to show/hide the value.
 *
 * Props: same as a standard <input> element (value, onChange, placeholder, required, disabled, className)
 */
export default function PasswordInput({ className = 'input', ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className="text-[14px]" />
      </button>
    </div>
  );
}
