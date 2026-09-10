import { useEffect, useRef, useState } from 'react';
import type { OrganizerOption } from '../lib/organizerOption';
import {
  SELF_ORGANIZER_OPTION_LABEL,
  ORGANIZER_INPUT_PLACEHOLDER,
  ORGANIZER_MANUAL_ADD_HINT,
} from './OrganizersField.constants';
import styles from './OrganizersField.module.css';

interface OrganizersFieldProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: OrganizerOption[];
  // Fires as the user types so the parent can fetch name suggestions.
  onQuery?: (query: string) => void;
  invalid?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

export default function OrganizersField({
  id,
  values,
  onChange,
  suggestions = [],
  onQuery,
  invalid,
  placeholder,
  ariaLabel,
}: OrganizersFieldProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...values, trimmed]);
    setInput('');
  };

  const remove = (name: string) => onChange(values.filter((v) => v !== name));

  const query = input.trim().toLowerCase();
  const options = suggestions.filter((o) => {
    if (values.some((v) => v.toLowerCase() === o.name.toLowerCase())) return false;
    return !query || o.name.toLowerCase().includes(query);
  });

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {values.length > 0 && (
        <div className={styles.chips}>
          {values.map((name) => (
            <span className={styles.chip} key={name}>
              {name}
              <button
                type="button"
                aria-label={`Прибрати ${name}`}
                onClick={() => remove(name)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={styles.comboWrap}>
        <div className={`${styles.field} ${invalid ? styles.invalid : ''}`}>
          <input
            id={id}
            type="text"
            autoComplete="off"
            className={styles.input}
            aria-label={ariaLabel}
            placeholder={placeholder ?? ORGANIZER_INPUT_PLACEHOLDER}
            value={input}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
              onQuery?.(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(input);
                setOpen(false);
              }
              if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
          />
        </div>
        {open && options.length > 0 && (
          <ul className={styles.dropdown} role="listbox" aria-label={ariaLabel}>
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={styles.option}
                  onClick={() => {
                    add(o.name);
                    setOpen(false);
                  }}
                >
                  {o.isSelf ? SELF_ORGANIZER_OPTION_LABEL : o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className={styles.hint}>{ORGANIZER_MANUAL_ADD_HINT}</p>
    </div>
  );
}
