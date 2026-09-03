export interface MentorCoach {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  schoolName: string | null;
  // False while this is a placeholder — the named coach has not registered
  // with this phone yet.
  confirmed: boolean;
}
