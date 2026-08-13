import { API_BASE_URL } from './api';

export interface Competition {
  id: string;
  image: string | null;
  name: string;
  description: string;
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
