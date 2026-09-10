import { Readable } from 'stream';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface S3ObjectLocation {
  bucket: string;
  key: string;
}

// Defers the GetObjectCommand until archiver actually starts reading this
// entry. archiver processes zip entries one at a time internally, so
// fetching every object up front (before archiver gets to it) would leave
// earlier objects' S3 response streams open and unconsumed while archiver
// works through the queue — this keeps at most one object stream open at a
// time, matching archiver's actual read cadence.
export class LazyS3ObjectStream extends Readable {
  private sourceIterator: AsyncIterator<Buffer> | null = null;

  constructor(
    private readonly client: S3Client,
    private readonly location: S3ObjectLocation,
  ) {
    super();
  }

  // Readable requires a synchronous void method here — the actual fetch is
  // async, so it's kicked off and reported through push()/destroy() instead
  // of being awaited directly in the override.
  _read(): void {
    void this.pullNext();
  }

  private async pullNext(): Promise<void> {
    try {
      if (!this.sourceIterator) {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: this.location.bucket,
            Key: this.location.key,
          }),
        );
        const body = response.Body as Readable;
        this.sourceIterator = body[
          Symbol.asyncIterator
        ]() as AsyncIterator<Buffer>;
      }
      const result: IteratorResult<Buffer> = await this.sourceIterator.next();
      this.push(result.done ? null : result.value);
    } catch (err) {
      this.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
