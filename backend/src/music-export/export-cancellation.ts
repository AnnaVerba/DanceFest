import { ExportJob } from './export-job.model';
import { ExportCancelledError } from './export-cancelled.error';
import { EXPORT_CANCEL_POLL_INTERVAL_MS } from './music-export.constants';

// Watches one export job's row for the organizer's cancel. The request that
// cancels may land on another instance, so the row — not memory — is the
// signal; `cancelled` rejects once it flips while being watched.
export class ExportCancellation {
  readonly cancelled: Promise<never>;
  private rejectCancelled: (err: Error) => void = () => {};
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly exportJobModel: typeof ExportJob,
    private readonly exportJobId: string,
  ) {
    this.cancelled = new Promise<never>((_, reject) => {
      this.rejectCancelled = reject;
    });
    // Observed now, so a cancel nobody is racing yet is not unhandled.
    this.cancelled.catch(() => {});
  }

  async throwIfCancelled(): Promise<void> {
    if (await this.isCancelled()) throw new ExportCancelledError();
  }

  watch(): void {
    this.timer = setInterval(() => {
      this.isCancelled()
        .then((cancelled) => {
          if (cancelled) this.rejectCancelled(new ExportCancelledError());
        })
        .catch(() => {
          /* a missed poll just waits for the next one */
        });
    }, EXPORT_CANCEL_POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async isCancelled(): Promise<boolean> {
    const row = await this.exportJobModel.findByPk(this.exportJobId, {
      attributes: ['status'],
    });
    return row?.status === 'cancelled';
  }
}
