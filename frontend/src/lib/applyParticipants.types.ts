// A dancer picked for a number on the apply form. Held as a full object: a
// coach finds dancers by name and a match may no longer be among the current
// search results by the time the form is submitted.
export interface SelectableParticipant {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
}
