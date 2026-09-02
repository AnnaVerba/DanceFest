import { authorizedFetch } from './auth';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import { UNKNOWN_INVITE_ERROR_TYPE } from './team.constants';

export interface TeamOrganizer {
  id: string;
  name: string;
  email: string;
}

export interface TeamAdmin {
  id: string;
  name: string;
  email: string;
  addedAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  name?: string;
  invitedAt: string;
  expiresAt: string;
}

export const VIEWER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
} as const;

export type ViewerRole = (typeof VIEWER_ROLE)[keyof typeof VIEWER_ROLE];

export interface TeamCompetitionSummary {
  id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
}

export interface TeamData {
  viewerRole: ViewerRole;
  competition: TeamCompetitionSummary;
  organizer: TeamOrganizer | null;
  admins: TeamAdmin[];
  invitations: TeamInvitation[];
}

export type InviteErrorType = 'already-member' | 'already-invited' | 'rate-limited';

export class TeamApiError extends Error {
  type: InviteErrorType | 'unknown';
  status: number;
  constructor(type: InviteErrorType | 'unknown', message: string, status: number) {
    super(message);
    this.type = type;
    this.status = status;
  }
}

interface ErrorPayload {
  errorCode?: InviteErrorType;
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
    throw new TeamApiError(
      UNKNOWN_INVITE_ERROR_TYPE,
      CANNOT_CONNECT_TO_SERVER_MESSAGE,
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    const errorCode = payload?.errorCode ?? UNKNOWN_INVITE_ERROR_TYPE;
    throw new TeamApiError(
      errorCode,
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getTeam(competitionId: string): Promise<TeamData> {
  return request<TeamData>(`/competitions/${competitionId}/team`);
}

export function inviteAdmin(
  competitionId: string,
  email: string,
  name: string,
): Promise<TeamInvitation> {
  return request<TeamInvitation>(`/competitions/${competitionId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
  });
}

export function resendInvitation(
  competitionId: string,
  invitationId: string,
): Promise<{ expiresAt: string }> {
  return request(`/competitions/${competitionId}/invitations/${invitationId}/resend`, {
    method: 'POST',
  });
}

export function revokeInvitation(
  competitionId: string,
  invitationId: string,
): Promise<void> {
  return request(`/competitions/${competitionId}/invitations/${invitationId}`, {
    method: 'DELETE',
  });
}

export function removeAdmin(competitionId: string, adminId: string): Promise<void> {
  return request(`/competitions/${competitionId}/admins/${adminId}`, {
    method: 'DELETE',
  });
}
