import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedAdmin }>();
    return request.user;
  },
);
