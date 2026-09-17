import { useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import PhoneField from '../PhoneField';
import { updateAdminUser } from '../../lib/adminUsers';
import type { AdminUser } from '../../lib/adminUsers.types';
import { ACCESS_LEVEL_LABELS } from '../../lib/roles';
import type { AccessLevel } from '../../lib/roles';
import {
  isValidBirthDate,
  isValidEmail,
  isValidName,
  isValidPhone,
} from '../../lib/validation';
import {
  BIRTH_DATE_INVALID_MESSAGE,
  EMAIL_INVALID_MESSAGE,
  NAME_INVALID_MESSAGE,
  PHONE_INVALID_MESSAGE,
} from '../../lib/validation.constants';
import { USER_SAVE_FAILED_MESSAGE } from './UserEditModal.constants';
import styles from './EditForm.module.css';

interface UserEditModalProps {
  // Mounted per user (keyed by id), so the form starts from this user.
  user: AdminUser;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}

interface UserForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  accessLevel: AccessLevel;
}

type UserFormErrors = Partial<Record<keyof UserForm, string>>;

function toForm(user: AdminUser): UserForm {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email ?? '',
    birthDate: user.birthDate ?? '',
    accessLevel: user.accessLevel,
  };
}

// Email and birth date may stay empty on an account that never had them.
function validate(form: UserForm): UserFormErrors {
  const errors: UserFormErrors = {};
  if (!isValidName(form.firstName)) errors.firstName = NAME_INVALID_MESSAGE;
  if (!isValidName(form.lastName)) errors.lastName = NAME_INVALID_MESSAGE;
  if (!isValidPhone(form.phone)) errors.phone = PHONE_INVALID_MESSAGE;
  if (form.email.trim() && !isValidEmail(form.email)) {
    errors.email = EMAIL_INVALID_MESSAGE;
  }
  if (form.birthDate && !isValidBirthDate(form.birthDate)) {
    errors.birthDate = BIRTH_DATE_INVALID_MESSAGE;
  }
  return errors;
}

export default function UserEditModal({
  user,
  onClose,
  onSaved,
}: UserEditModalProps) {
  const [form, setForm] = useState<UserForm>(() => toForm(user));
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patch = (changes: Partial<UserForm>) =>
    setForm((prev) => ({ ...prev, ...changes }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSaveError(null);
    try {
      const saved = await updateAdminUser(user.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone,
        accessLevel: form.accessLevel,
        ...(form.email.trim() && { email: form.email.trim() }),
        ...(form.birthDate && { birthDate: form.birthDate }),
      });
      onSaved(saved);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : USER_SAVE_FAILED_MESSAGE,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof UserForm) =>
    errors[field] ? `${styles.input} ${styles.invalid}` : styles.input;

  return (
    <Modal
      open
      title="Редагувати користувача"
      onClose={onClose}
      closeDisabled={submitting}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.two}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="user-last-name">
              Прізвище
            </label>
            <input
              id="user-last-name"
              className={inputClass('lastName')}
              value={form.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
            />
            {errors.lastName && (
              <p className={styles.error}>{errors.lastName}</p>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="user-first-name">
              Імʼя
            </label>
            <input
              id="user-first-name"
              className={inputClass('firstName')}
              value={form.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
            />
            {errors.firstName && (
              <p className={styles.error}>{errors.firstName}</p>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="user-phone">
            Телефон
          </label>
          <PhoneField
            id="user-phone"
            value={form.phone}
            invalid={!!errors.phone}
            onChange={(phone) => patch({ phone })}
          />
          {errors.phone && <p className={styles.error}>{errors.phone}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="user-email">
            Email
          </label>
          <input
            id="user-email"
            type="email"
            className={inputClass('email')}
            value={form.email}
            onChange={(e) => patch({ email: e.target.value })}
          />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>

        <div className={styles.two}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="user-birth-date">
              Дата народження
            </label>
            <input
              id="user-birth-date"
              type="date"
              className={inputClass('birthDate')}
              value={form.birthDate}
              onChange={(e) => patch({ birthDate: e.target.value })}
            />
            {errors.birthDate && (
              <p className={styles.error}>{errors.birthDate}</p>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="user-access-level">
              Рівень доступу
            </label>
            <select
              id="user-access-level"
              className={styles.input}
              value={form.accessLevel}
              onChange={(e) =>
                patch({ accessLevel: e.target.value as AccessLevel })
              }
            >
              {(Object.keys(ACCESS_LEVEL_LABELS) as AccessLevel[]).map(
                (level) => (
                  <option key={level} value={level}>
                    {ACCESS_LEVEL_LABELS[level]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {saveError && <p className={styles.error}>{saveError}</p>}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Збереження…' : 'Зберегти'}
        </button>
      </form>
    </Modal>
  );
}
