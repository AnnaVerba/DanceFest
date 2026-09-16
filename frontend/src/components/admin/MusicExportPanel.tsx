import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/http';
import { getMusicExportJob, queueMusicExport } from '../../lib/musicExport';
import {
  MUSIC_EXPORT_POLL_INTERVAL_MS,
  MUSIC_EXPORT_QUEUE_FAILED_MESSAGE,
  MUSIC_EXPORT_STATUS_FAILED_MESSAGE,
} from '../../lib/musicExport.constants';
import { queryKeys } from '../../lib/queryKeys';
import styles from './MusicExportPanel.module.css';

interface MusicExportPanelProps {
  competitionId: string;
  canManage: boolean;
}

export default function MusicExportPanel({
  competitionId,
  canManage,
}: MusicExportPanelProps) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A running job — not cached data, polled while it's in flight and
  // dropped once done. Never persisted between sessions.
  const jobQuery = useQuery({
    queryKey: queryKeys.zipJob(jobId ?? ''),
    queryFn: () => getMusicExportJob(jobId!),
    enabled: !!jobId,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;
      const status = query.state.data?.status;
      return status === 'completed' || status === 'failed'
        ? false
        : MUSIC_EXPORT_POLL_INTERVAL_MS;
    },
  });
  const job = jobQuery.data ?? null;

  // Surface a failed poll once, during render rather than in an effect —
  // each new query error (a fresh object per failed fetch) is seeded in.
  const [seenPollError, setSeenPollError] = useState<unknown>(undefined);
  if (jobQuery.isError && jobQuery.error !== seenPollError) {
    setSeenPollError(jobQuery.error);
    setError(
      jobQuery.error instanceof ApiError
        ? jobQuery.error.message
        : MUSIC_EXPORT_STATUS_FAILED_MESSAGE,
    );
  }

  const queueMutation = useMutation({
    mutationFn: () => queueMusicExport(competitionId),
    onSuccess: ({ jobId: newJobId }) => {
      queryClient.setQueryData(queryKeys.zipJob(newJobId), {
        status: 'queued',
        progress: 0,
        missing: [],
      });
      setJobId(newJobId);
    },
  });

  const handleStart = async () => {
    setError(null);
    try {
      await queueMutation.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : MUSIC_EXPORT_QUEUE_FAILED_MESSAGE);
    }
  };

  if (!canManage) return null;

  const inProgress = job?.status === 'queued' || job?.status === 'processing';

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>Архів музики</h3>
          <p className={styles.note}>
            Один .zip з усіма треками конкурсу у порядку виступів.
          </p>
        </div>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleStart}
          disabled={queueMutation.isPending || inProgress}
        >
          {inProgress ? 'Готуємо архів...' : 'Скачати архів музики'}
        </button>
      </div>

      {inProgress && (
        <div className={styles.progress}>
          <p className={styles.progressLabel}>{job.progress}%</p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}

      {job?.status === 'completed' && job.fileUrl && (
        <div className={styles.result}>
          <a
            href={job.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
          >
            Завантажити .zip
          </a>
        </div>
      )}

      {job?.status === 'failed' && (
        <p className={styles.error}>Не вдалося зібрати архів. Спробуйте ще раз.</p>
      )}

      {job?.missing && job.missing.length > 0 && (
        <div className={styles.missing}>
          <p>Без музики ({job.missing.length}):</p>
          <ul>
            {job.missing.map((track) => (
              <li key={track.number}>
                №{track.number} — {track.dancerName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
