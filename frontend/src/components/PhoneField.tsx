import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import styles from './PhoneField.module.css';

interface PhoneFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  // Id of the element describing the field, e.g. its error message.
  ariaDescribedBy?: string;
}

export default function PhoneField({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  ariaLabel,
  ariaDescribedBy,
}: PhoneFieldProps) {
  return (
    <PhoneInput
      id={id}
      className={`${styles.phone} ${invalid ? styles.invalid : ''}`}
      defaultCountry="UA"
      international
      countryCallingCodeEditable={false}
      placeholder={placeholder ?? 'Номер телефону'}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      aria-describedby={ariaDescribedBy}
      value={value || undefined}
      onChange={(v) => onChange(v ?? '')}
    />
  );
}
