import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { DEVICE_ID_HEADER } from './auth.constants';
import type { ClientContext } from './client-context.interface';

// Pulls the caller's IP, User-Agent and device id off the request so the
// auth handlers can record them against the session they issue.
export const ClientContextParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return {
      ipAddress: request.ip ?? null,
      userAgent: request.header('user-agent') ?? null,
      fingerprint: request.header(DEVICE_ID_HEADER) ?? null,
    };
  },
);
