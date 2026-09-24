import { useEffect, useRef, useState } from 'react';
import type { OrganizerOption } from '../lib/organizerOption';
import type { OrganizerChip } from '../lib/organizerChip';
import {
  SELF_ORGANIZER_OPTION_LABEL,
  ORGANIZER_INPUT_PLACEHOLDER,
  ORGANIZER_SELECT_ONLY_HINT,
} from './OrganizersField.constants';
import styles from './OrganizersField.module.css';

interface OrganizersFieldProps {
  id?: string;
  values: OrganizerChip[];
  onChange: (values: OrganizerChip[]) => void;
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

  // Only an existing account from `suggestions` can be added — never
  // whatever the user typed — so the field can't name a non-organizer.
  const add = (option: OrganizerOption) => {
    const trimmed = option.name.trim();
    if (!trimmed) return;
    if (values.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...values, { id: option.id, name: trimmed }]);
    setInput('');
  };

  const remove = (name: string) => onChange(values.filter((v) => v.name !== name));

  const query = input.trim().toLowerCase();
  const options = suggestions.filter((o) => {
    if (values.some((v) => v.name.toLowerCase() === o.name.toLowerCase())) return false;
    return !query || o.name.toLowerCase().includes(query);
  });

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {values.length > 0 && (
        <div className={styles.chips}>
          {values.map(({ name }) => (
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
                if (options[0]) {
                  add(options[0]);
                  setOpen(false);
                }
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
                    add(o);
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
      <p className={styles.hint}>{ORGANIZER_SELECT_ONLY_HINT}</p>
    </div>
  );
}
