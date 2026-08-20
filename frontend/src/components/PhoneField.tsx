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
}

export default function PhoneField({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  ariaLabel,
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
      value={value || undefined}
      onChange={(v) => onChange(v ?? '')}
    />
  );
}
