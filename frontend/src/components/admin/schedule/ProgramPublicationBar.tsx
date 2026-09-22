import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../ConfirmDialog';
import {
  getProgramPublication,
  publishProgram,
  unpublishProgram,
} from '../../../lib/programPublication';
import { PROGRAM_STATUS } from '../../../lib/programPublication.constants';
import type { ProgramPublicationStatus } from '../../../lib/programPublication.types';
import { queryKeys } from '../../../lib/queryKeys';
import {
  PUBLISHED_AT_LOCALE,
  PUBLISHED_AT_PREFIX,
  PUBLISH_ERROR_MESSAGE,
  PUBLISH_LABEL,
  PUBLISH_SUCCESS_MESSAGE,
  STATUS_DRAFT_LABEL,
  STATUS_LOAD_ERROR_MESSAGE,
  STATUS_PUBLISHED_LABEL,
  UNPUBLISHED_CHANGES_LABEL,
  UNPUBLISH_CONFIRM_DESCRIPTION,
  UNPUBLISH_CONFIRM_TITLE,
  UNPUBLISH_LABEL,
  UNPUBLISH_SUCCESS_MESSAGE,
  UPDATE_PUBLISHED_LABEL,
  UPDATE_SUCCESS_MESSAGE,
} from './programPublication.constants';
import styles from './program.module.css';

interface ProgramPublicationBarProps {
  competitionId: string;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

function formatPublishedAt(iso: string): string {
  return new Date(iso).toLocaleString(PUBLISHED_AT_LOCALE);
}

// Publish controls for the organizer: the audience sees a snapshot taken at
// publish time, so edits stay private until published (again).
export default function ProgramPublicationBar({
  competitionId,
  onError,
  onNotice,
}: ProgramPublicationBarProps) {
  const queryClient = useQueryClient();
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);
  const statusKey = queryKeys.programPublication(competitionId);

  const statusQuery = useQuery({
    queryKey: statusKey,
    queryFn: () => getProgramPublication(competitionId),
  });

  useEffect(() => {
    if (statusQuery.isError) onError(STATUS_LOAD_ERROR_MESSAGE);
  }, [statusQuery.isError, onError]);

  const applyStatus = async (
    next: ProgramPublicationStatus,
    message: string,
  ) => {
    queryClient.setQueryData(statusKey, next);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.publicProgram(competitionId),
    });
    onNotice(message);
  };

  const publishMutation = useMutation({
    mutationFn: () => publishProgram(competitionId),
    onSuccess: (next) =>
      applyStatus(
        next,
        statusQuery.data?.status === PROGRAM_STATUS.PUBLISHED
          ? UPDATE_SUCCESS_MESSAGE
          : PUBLISH_SUCCESS_MESSAGE,
      ),
    onError: () => onError(PUBLISH_ERROR_MESSAGE),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishProgram(competitionId),
    onSuccess: (next) => applyStatus(next, UNPUBLISH_SUCCESS_MESSAGE),
    onError: () => onError(PUBLISH_ERROR_MESSAGE),
  });

  const publication = statusQuery.data;
  if (!publication) return null;

  const published = publication.status === PROGRAM_STATUS.PUBLISHED;
  const busy = publishMutation.isPending || unpublishMutation.isPending;

  return (
    <div className={styles.publicationBar}>
      <span
        className={`${styles.publicationStatus} ${published ? styles.publicationOn : ''}`}
      >
        {published
          ? `${STATUS_PUBLISHED_LABEL} ${PUBLISHED_AT_PREFIX} ${formatPublishedAt(publication.publishedAt ?? '')}`
          : STATUS_DRAFT_LABEL}
      </span>
      {published && publication.hasUnpublishedChanges && (
        <span className={styles.publicationChanges}>
          {UNPUBLISHED_CHANGES_LABEL}
        </span>
      )}
      <div className={styles.spacer} />
      <button
        type="button"
        className={styles.primaryBtn}
        disabled={busy || (published && !publication.hasUnpublishedChanges)}
        onClick={() => publishMutation.mutate()}
      >
        {published ? UPDATE_PUBLISHED_LABEL : PUBLISH_LABEL}
      </button>
      {published && (
        <button
          type="button"
          className={styles.ghostBtn}
          disabled={busy}
          onClick={() => setConfirmingUnpublish(true)}
        >
          {UNPUBLISH_LABEL}
        </button>
      )}
      <ConfirmDialog
        open={confirmingUnpublish}
        title={UNPUBLISH_CONFIRM_TITLE}
        description={UNPUBLISH_CONFIRM_DESCRIPTION}
        confirmLabel={UNPUBLISH_LABEL}
        onConfirm={async () => {
          await unpublishMutation.mutateAsync().catch(() => undefined);
          setConfirmingUnpublish(false);
        }}
        onCancel={() => setConfirmingUnpublish(false)}
      />
    </div>
  );
}
