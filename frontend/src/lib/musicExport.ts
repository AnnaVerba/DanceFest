import { apiRequest } from './http';

export type MusicExportJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface MissingTrack {
  number: number;
  dancerName: string;
}

export interface MusicExportJob {
  status: MusicExportJobStatus;
  progress: number;
  fileUrl?: string;
  missing: MissingTrack[];
}

// Queues a .zip of every track for the competition, in performance order.
// Organizer/owner or admin only — enforced server-side.
export function queueMusicExport(
  competitionId: string,
): Promise<{ jobId: string }> {
  return apiRequest<{ jobId: string }>(
    `/contests/${competitionId}/music/export`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export function getMusicExportJob(jobId: string): Promise<MusicExportJob> {
  return apiRequest<MusicExportJob>(`/jobs/${jobId}`);
}

// Stops a queued or running export; returns the job as it stands after.
export function cancelMusicExport(jobId: string): Promise<MusicExportJob> {
  return apiRequest<MusicExportJob>(`/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
}
