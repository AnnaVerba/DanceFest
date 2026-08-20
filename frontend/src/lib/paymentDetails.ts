import { authorizedFetch } from './auth';

export interface PaymentDetails {
  id: string;
  beneficiary: string;
  account: string;
  bankName: string | null;
  taxId: string | null;
  destination: string | null;
}

export interface PaymentDetailsInput {
  beneficiary: string;
  account: string;
  bankName?: string;
  taxId?: string;
  destination?: string;
}

export class PaymentDetailsApiError extends Error {
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await authorizedFetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new PaymentDetailsApiError("Не вдалося з'єднатися з сервером", 0);
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new PaymentDetailsApiError(
      extractMessage(payload, 'Не вдалося зберегти реквізити оплати.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getPaymentDetails(competitionId: string): Promise<PaymentDetails | null> {
  return request<PaymentDetails | null>(`/competitions/${competitionId}/payment-details`);
}

export function upsertPaymentDetails(
  competitionId: string,
  input: PaymentDetailsInput,
): Promise<PaymentDetails> {
  return request<PaymentDetails>(`/competitions/${competitionId}/payment-details`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
