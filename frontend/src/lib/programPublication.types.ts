import type { PROGRAM_STATUS } from './programPublication.constants';

export type ProgramStatus = (typeof PROGRAM_STATUS)[keyof typeof PROGRAM_STATUS];

export interface ProgramPublicationStatus {
  status: ProgramStatus;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
}
