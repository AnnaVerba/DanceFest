import { useState } from 'react';
import styles from './OrganizersField.module.css';

interface OrganizersFieldProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  invalid?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

export default function OrganizersField({
  id,
  values,
  onChange,
  suggestions = [],
  invalid,
  placeholder,
  ariaLabel,
}: OrganizersFieldProps) {
  const [input, setInput] = useState('');

  const add = () => {
    const name = input.trim();
    if (!name) return;
    if (values.some((v) => v.toLowerCase() === name.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...values, name]);
    setInput('');
  };

  const remove = (name: string) => onChange(values.filter((v) => v !== name));

  const datalistId = id ? `${id}-suggestions` : undefined;
  const availableSuggestions = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className={styles.wrap}>
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
      <div className={`${styles.add} ${invalid ? styles.invalid : ''}`}>
        <input
          id={id}
          type="text"
          list={datalistId}
          autoComplete="off"
          className={styles.input}
          aria-label={ariaLabel}
          placeholder={placeholder ?? "Ім'я або назва організатора"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className={styles.btnAdd} onClick={add}>
          Додати
        </button>
      </div>
      {datalistId && (
        <datalist id={datalistId}>
          {availableSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
