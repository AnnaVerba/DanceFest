import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/http';
import { getMusicExportJob, queueMusicExport } from '../../lib/musicExport';
import type { MusicExportJob } from '../../lib/musicExport';
import {
  MUSIC_EXPORT_POLL_INTERVAL_MS,
  MUSIC_EXPORT_QUEUE_FAILED_MESSAGE,
  MUSIC_EXPORT_STATUS_FAILED_MESSAGE,
} from '../../lib/musicExport.constants';
import styles from './MusicExportPanel.module.css';

interface MusicExportPanelProps {
  competitionId: string;
  canManage: boolean;
}

export default function MusicExportPanel({
  competitionId,
  canManage,
}: MusicExportPanelProps) {
  const [job, setJob] = useState<MusicExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const poll = (jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await getMusicExportJob(jobId);
        setJob(status);
        if (status.status === 'completed' || status.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err) {
        if (pollRef.current) clearInterval(pollRef.current);
        setError(err instanceof ApiError ? err.message : MUSIC_EXPORT_STATUS_FAILED_MESSAGE);
      }
    }, MUSIC_EXPORT_POLL_INTERVAL_MS);
  };

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      const { jobId } = await queueMusicExport(competitionId);
      setJob({ status: 'queued', progress: 0, missing: [] });
      poll(jobId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : MUSIC_EXPORT_QUEUE_FAILED_MESSAGE);
    } finally {
      setStarting(false);
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
          disabled={starting || inProgress}
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
