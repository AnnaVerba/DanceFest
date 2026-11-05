import styles from './EditForm.module.css';

interface EntryReadonlyFieldProps {
  id: string;
  label: string;
  value: string;
}

// A value the form shows but the staff cannot type — it follows from other
// fields of the entry.
export default function EntryReadonlyField({
  id,
  label,
  value,
}: EntryReadonlyFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={styles.input} readOnly value={value} />
    </div>
  );
}
