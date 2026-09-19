import { expect, type APIRequestContext } from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';

export interface Category {
  id: string;
  name: string;
  type: string;
  ageFrom: number | null;
  ageTo: number | null;
}

export interface Nomination {
  id: string;
  name: string;
  venueId: string | null;
  allowsImprovisation: boolean;
  durationLimitSeconds: number | null;
  durationOverridden: boolean;
  categoryIds: string[];
}

export interface SectionItem {
  type: string;
  durationSeconds: number | null;
  nominationGroupKey: string | null;
  exit: { entryId: string; venueId: string | null } | null;
}

export interface Section {
  id: string;
  name: string;
  dayId: string;
  venueId: string | null;
  items: SectionItem[];
}

/** Thin admin REST client for setup, assertions and cleanup around the UI checks. */
export class AdminApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  private url(path: string): string {
    return `${BACKEND_BASE_URL}${path}`;
  }

  private headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.request.get(this.url(path), { headers: this.headers() });
    expect(res.ok(), `GET ${path} → ${res.status()} ${await res.text()}`).toBeTruthy();
    return (await res.json()) as T;
  }

  async send<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, data?: unknown): Promise<T> {
    const res = await this.request.fetch(this.url(path), {
      method,
      headers: this.headers(),
      data,
    });
    expect(res.ok(), `${method} ${path} → ${res.status()} ${await res.text()}`).toBeTruthy();
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** Cleanup-only delete: a row already gone (404) is fine. */
  async deleteIfExists(path: string): Promise<void> {
    const res = await this.request.delete(this.url(path), { headers: this.headers() });
    expect(res.ok() || res.status() === 404, `DELETE ${path} → ${res.status()}`).toBeTruthy();
  }

  async rawPost(path: string, data: unknown) {
    return this.request.post(this.url(path), { headers: this.headers(), data });
  }

  categories(): Promise<Category[]> {
    return this.get<Category[]>('/categories');
  }

  nominations(competitionId: string): Promise<Nomination[]> {
    return this.get<Nomination[]>(`/competitions/${competitionId}/nominations`);
  }

  async sections(competitionId: string): Promise<Section[]> {
    const page = await this.get<{ rows: Section[] }>(
      `/competitions/${competitionId}/sections?pageSize=100`,
    );
    return page.rows;
  }

  setLeagueLimits(competitionId: string, leagueLimits: Record<string, number>) {
    return this.send('PATCH', `/competitions/${competitionId}/rules`, { leagueLimits });
  }
}
