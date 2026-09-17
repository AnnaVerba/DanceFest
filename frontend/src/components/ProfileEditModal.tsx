import { useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './admin/Modal';
import SchoolPicker from './SchoolPicker';
import MentorCoachPicker from './MentorCoachPicker';
import { updateMyProfile } from '../lib/users';
import type { MyProfile } from '../lib/users';
import type { SetMentorCoachBody } from '../lib/auth';
import { ACCESS_LEVEL, canHaveMentorCoach, meetsLevel } from '../lib/roles';
import { toProfileForm, validateProfileForm } from '../lib/profileForm';
import type {
  ProfileErrorField,
  ProfileFieldErrors,
  ProfileFormValues,
} from '../lib/profileForm.types';
import { MIN_BIRTH_DATE } from '../lib/validation.constants';
import {
  CHANGE_COACH_LABEL,
  COACH_CHOICE_REQUIRED_MESSAGE,
  COACH_SECTION_LABEL,
  KEEP_COACH_LABEL,
  PROFILE_EDIT_TITLE,
  PROFILE_SAVE_FAILED_MESSAGE,
  PROFILE_SAVE_LABEL,
  PROFILE_SAVING_LABEL,
} from './ProfileEditModal.constants';
import formStyles from './admin/EditForm.module.css';
import styles from './ProfileEditModal.module.css';

interface ProfileEditModalProps {
  profile: MyProfile;
  onClose: () => void;
  onSaved: (profile: MyProfile) => void;
}

export default function ProfileEditModal({
  profile,
  onClose,
  onSaved,
}: ProfileEditModalProps) {
  const [initial] = useState<ProfileFormValues>(() => toProfileForm(profile));
  const [form, setForm] = useState<ProfileFormValues>(initial);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // The current coach stays unless the user opens the picker.
  const [changingCoach, setChangingCoach] = useState(false);
  const [mentor, setMentor] = useState<SetMentorCoachBody | null>(null);
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const canEditSchool = meetsLevel(profile.accessLevel, ACCESS_LEVEL.COACH);
  const canEditCoach = canHaveMentorCoach(profile.accessLevel);

  const clearError = (field: ProfileErrorField) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Editing a field hides its error until the next save.
  const patch = (field: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const pickMentor = (value: SetMentorCoachBody | null) => {
    setMentor(value);
    clearError('coach');
  };

  const toggleCoachChange = () => {
    setChangingCoach((prev) => !prev);
    setMentor(null);
    clearError('coach');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found = validateProfileForm(form, initial);
    if (changingCoach && !mentor) {
      found.coach = COACH_CHOICE_REQUIRED_MESSAGE;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSaveError(null);
    try {
      const saved = await updateMyProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        ...(form.email.trim() && { email: form.email.trim() }),
        ...(form.birthDate && { birthDate: form.birthDate }),
        ...(form.schoolId &&
          form.schoolId !== initial.schoolId && { schoolId: form.schoolId }),
        ...(changingCoach && mentor),
      });
      onSaved(saved);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : PROFILE_SAVE_FAILED_MESSAGE,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof ProfileFormValues) =>
    errors[field]
      ? `${formStyles.input} ${formStyles.invalid}`
      : formStyles.input;

  return (
    <Modal
      open
      title={PROFILE_EDIT_TITLE}
      onClose={onClose}
      closeDisabled={submitting}
    >
      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        <div className={formStyles.two}>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="profile-first-name">
              Імʼя
            </label>
            {errors.firstName && (
              <p id="profile-first-name-error" className={styles.fieldError}>
                {errors.firstName}
              </p>
            )}
            <input
              id="profile-first-name"
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? 'profile-first-name-error' : undefined}
              className={inputClass('firstName')}
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => patch('firstName', e.target.value)}
            />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="profile-last-name">
              Прізвище
            </label>
            {errors.lastName && (
              <p id="profile-last-name-error" className={styles.fieldError}>
                {errors.lastName}
              </p>
            )}
            <input
              id="profile-last-name"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? 'profile-last-name-error' : undefined}
              className={inputClass('lastName')}
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => patch('lastName', e.target.value)}
            />
          </div>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="profile-email">
            Email
          </label>
          {errors.email && (
            <p id="profile-email-error" className={styles.fieldError}>
              {errors.email}
            </p>
          )}
          <input
            id="profile-email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'profile-email-error' : undefined}
            type="email"
            className={inputClass('email')}
            autoComplete="email"
            value={form.email}
            onChange={(e) => patch('email', e.target.value)}
          />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="profile-birth-date">
            Дата народження
          </label>
          {errors.birthDate && (
            <p id="profile-birth-date-error" className={styles.fieldError}>
              {errors.birthDate}
            </p>
          )}
          <input
            id="profile-birth-date"
            aria-invalid={Boolean(errors.birthDate)}
            aria-describedby={errors.birthDate ? 'profile-birth-date-error' : undefined}
            type="date"
            className={inputClass('birthDate')}
            min={MIN_BIRTH_DATE}
            max={maxBirthDate}
            value={form.birthDate}
            onChange={(e) => patch('birthDate', e.target.value)}
          />
        </div>

        {canEditSchool && (
          <div className={formStyles.field}>
            {errors.schoolId && (
              <p role="alert" className={styles.fieldError}>
                {errors.schoolId}
              </p>
            )}
            <SchoolPicker
              value={form.schoolId}
              onChange={(schoolId) => patch('schoolId', schoolId)}
            />
          </div>
        )}

        {canEditCoach && (
          <div className={formStyles.field}>
            <span className={formStyles.label}>{COACH_SECTION_LABEL}</span>
            {errors.coach && (
              <p role="alert" className={styles.fieldError}>
                {errors.coach}
              </p>
            )}
            {changingCoach && <MentorCoachPicker onChange={pickMentor} />}
            <button
              type="button"
              className={styles.coachToggle}
              onClick={toggleCoachChange}
            >
              {changingCoach ? KEEP_COACH_LABEL : CHANGE_COACH_LABEL}
            </button>
          </div>
        )}

        <div aria-live="polite">
          {saveError && <p className={formStyles.error}>{saveError}</p>}
        </div>
        <button
          type="submit"
          className={formStyles.submit}
          disabled={submitting}
        >
          {submitting ? PROFILE_SAVING_LABEL : PROFILE_SAVE_LABEL}
        </button>
      </form>
    </Modal>
  );
}
