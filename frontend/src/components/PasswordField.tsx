import { useState } from 'react';
import {
  HIDE_PASSWORD_LABEL,
  SHOW_PASSWORD_LABEL,
} from './PasswordField.constants';
import styles from './PasswordField.module.css';

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  className?: string;
  placeholder?: string;
  invalid?: boolean;
  // Id of the element describing the field, e.g. its error message.
  ariaDescribedBy?: string;
}

// A password input with an eye button that reveals what was typed.
export default function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  className,
  placeholder,
  invalid,
  ariaDescribedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? HIDE_PASSWORD_LABEL : SHOW_PASSWORD_LABEL;

  return (
    <div className={styles.wrapper}>
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={id}
        className={`${styles.input} ${className ?? ''}`}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={ariaDescribedBy}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
      >
        {visible ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2" />
            <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            <path d="M2 2l20 20" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
