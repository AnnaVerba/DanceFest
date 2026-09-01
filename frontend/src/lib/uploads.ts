import { authorizedFetch } from './auth';

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
    throw new UploadApiError("Не вдалося з'єднатися з сервером", 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & { url?: string })
    | null;

  if (!response.ok) {
    throw new UploadApiError(
      extractMessage(payload, 'Не вдалося завантажити зображення. Спробуйте ще раз.'),
      response.status,
    );
  }

  return (payload?.url as string) ?? '';
}
