import { authorizedFetch } from './auth';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import {
  DOCUMENT_UPLOAD_FAILED_MESSAGE,
  IMAGE_UPLOAD_FAILED_MESSAGE,
} from './uploads.constants';

const IMAGE_UPLOAD_PATH = '/uploads/image';
const DOCUMENT_UPLOAD_PATH = '/uploads/document';

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

async function uploadFile(
  path: string,
  file: File,
  failureMessage: string,
): Promise<string> {
  const body = new FormData();
  body.append('file', file);

  let response: Response;
  try {
    response = await authorizedFetch(path, {
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
      extractMessage(payload, failureMessage),
      response.status,
    );
  }

  return (payload?.url as string) ?? '';
}

export function uploadImage(file: File): Promise<string> {
  return uploadFile(IMAGE_UPLOAD_PATH, file, IMAGE_UPLOAD_FAILED_MESSAGE);
}

export function uploadDocument(file: File): Promise<string> {
  return uploadFile(DOCUMENT_UPLOAD_PATH, file, DOCUMENT_UPLOAD_FAILED_MESSAGE);
}
