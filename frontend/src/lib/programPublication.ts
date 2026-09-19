import { apiRequest } from './http';
import type { ProgramPublicationStatus } from './programPublication.types';

export function getProgramPublication(
  competitionId: string,
): Promise<ProgramPublicationStatus> {
  return apiRequest<ProgramPublicationStatus>(
    `/competitions/${competitionId}/program/publication`,
  );
}

export function publishProgram(
  competitionId: string,
): Promise<ProgramPublicationStatus> {
  return apiRequest<ProgramPublicationStatus>(
    `/competitions/${competitionId}/program/publish`,
    { method: 'POST' },
  );
}

export function unpublishProgram(
  competitionId: string,
): Promise<ProgramPublicationStatus> {
  return apiRequest<ProgramPublicationStatus>(
    `/competitions/${competitionId}/program/unpublish`,
    { method: 'POST' },
  );
}
