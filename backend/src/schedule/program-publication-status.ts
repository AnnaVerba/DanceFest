import type { ProgramStatus } from './program-status';

export interface ProgramPublicationStatus {
  status: ProgramStatus;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
}
