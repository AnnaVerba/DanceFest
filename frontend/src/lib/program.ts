import { apiRequest, publicRequest } from './http';
import { getToken } from './auth';
import { withPageParams } from './pagination';
import type { RowPaged } from './pagination';

export interface PublicProgramRow {
  kind: 'section' | 'group' | 'exit' | 'award' | 'break' | 'gala';
  label: string | null;
  time: string;
  dayId: string;
  dayDate: string | null;
  venueId: string | null;
  // Only on `exit` rows.
  participantNumbers?: (number | null)[];
  routineName?: string | null;
  studioName?: string | null;
  choreographer?: string | null;
  durationSeconds?: number | null;
}

export interface MineExitRow {
  time: string;
  number: number;
  participantNumbers: (number | null)[];
  nomination: string;
  groupLabel: string;
  isMine: boolean;
  isMyStudent: boolean;
  performerName: string;
}

export interface MineProgramSection {
  id: string;
  name: string;
  time: string;
  dayId: string;
  venueId: string | null;
  exits: MineExitRow[];
}

export interface MineProgram {
  sections: MineProgramSection[];
  totals: { mine: number; students: number };
}

export interface ExtendedProgramItem {
  type: 'performance' | 'award' | 'break' | 'gala';
  time: string;
  groupLabel: string | null;
  number: number | null;
  participantNumbers: (number | null)[];
  nomination: string | null;
  routineName: string | null;
  studioName: string | null;
  choreographer: string | null;
  effectiveDurationSeconds: number | null;
  hasTrack: boolean;
}

export interface ExtendedProgramSection {
  id: string;
  name: string;
  time: string;
  dayId: string;
  venueId: string | null;
  items: ExtendedProgramItem[];
}

export interface PublicProgramQuery {
  dayId?: string;
  page?: number;
  pageSize?: number;
}

// Row-bounded pagination: a page carries whole sections up to ~60 rows.
export function getPublicProgram(
  competitionId: string,
  query: PublicProgramQuery = {},
): Promise<RowPaged<PublicProgramRow>> {
  const params = new URLSearchParams();
  if (query.dayId) params.set('dayId', query.dayId);
  withPageParams(params, query.page, query.pageSize);
  const suffix = params.toString() ? `?${params}` : '';
  return publicRequest<RowPaged<PublicProgramRow>>(
    `/competitions/${competitionId}/program${suffix}`,
  );
}

export function getMyProgram(competitionId: string): Promise<MineProgram> {
  return apiRequest<MineProgram>(`/competitions/${competitionId}/program/mine`);
}

// The public schedule page asks for the personal cut only when there is a
// session to attach; otherwise it shows the anonymous poster.
export function hasSession(): boolean {
  return getToken() != null;
}

export function getExtendedProgram(
  competitionId: string,
): Promise<ExtendedProgramSection[]> {
  return apiRequest<ExtendedProgramSection[]>(
    `/competitions/${competitionId}/program/extended`,
  );
}
