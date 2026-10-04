import { HttpStatus } from '@nestjs/common';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { TRACK_EXISTENCE_CHECK_BATCH } from './music-export.constants';

function isNotFound(err: unknown): boolean {
  return (
    (err as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata
      ?.httpStatusCode === HttpStatus.NOT_FOUND
  );
}

async function objectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

// Which of `keys` really exist in `bucket`: a track row can outlive its
// object, and one missing object would otherwise fail the whole archive.
export async function existingObjectKeys(
  client: S3Client,
  bucket: string,
  keys: string[],
): Promise<Set<string>> {
  const existing = new Set<string>();
  for (let i = 0; i < keys.length; i += TRACK_EXISTENCE_CHECK_BATCH) {
    const batch = keys.slice(i, i + TRACK_EXISTENCE_CHECK_BATCH);
    const found = await Promise.all(
      batch.map((key) => objectExists(client, bucket, key)),
    );
    batch.forEach((key, index) => {
      if (found[index]) existing.add(key);
    });
  }
  return existing;
}
