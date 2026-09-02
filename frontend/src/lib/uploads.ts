import { authorizedFetch } from './auth';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import { IMAGE_UPLOAD_FAILED_MESSAGE } from './uploads.constants';

export class UploadApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ErrorPayload {
  message?: string | string[];
}

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
}

export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);

  let response: Response;
  try {
    response = await authorizedFetch('/uploads/image', {
      method: 'POST',
      body,
    });
  } catch {
    throw new UploadApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & { url?: string })
    | null;

  if (!response.ok) {
    throw new UploadApiError(
      extractMessage(payload, IMAGE_UPLOAD_FAILED_MESSAGE),
      response.status,
    );
  }

  return (payload?.url as string) ?? '';
}
