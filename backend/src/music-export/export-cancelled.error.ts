import { EXPORT_CANCELLED_MESSAGE } from './music-export.constants';

// Thrown inside the worker once the organizer has cancelled the export —
// the job row already says so, so it is not a failure to record.
export class ExportCancelledError extends Error {
  constructor() {
    super(EXPORT_CANCELLED_MESSAGE);
  }
}
