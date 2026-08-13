import { API_BASE_URL } from './api';

export interface Competition {
  id: string;
  image: string | null;
  name: string;
  description: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  registrationFrom: string;
  registrationTo: string;
  contactNumber: string;
  contactEmail: string;
}

export async function getCompetitions(): Promise<Competition[]> {
  const response = await fetch(`${API_BASE_URL}/competitions`);
  if (!response.ok) {
    throw new Error('Не вдалося завантажити конкурси');
  }
  return response.json() as Promise<Competition[]>;
}

/** Бекенд не зберігає статус — рахуємо його з дат на льоту. */
export function getCompetitionStatus(c: Competition): string {
  const now = new Date();
  const registrationFrom = new Date(c.registrationFrom);
  const registrationTo = new Date(c.registrationTo);
  const dateFrom = new Date(c.dateFrom);
  const dateTo = new Date(c.dateTo);

  if (now < registrationFrom) return 'Заплановано';
  if (now <= registrationTo) return 'Реєстрація відкрита';
  if (now < dateFrom) return 'Реєстрація закрита';
  if (now <= dateTo) return 'Триває';
  return 'Завершено';
}
