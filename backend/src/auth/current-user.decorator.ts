import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user.interface';

// Kept as an alias so the many controllers that annotate their handler
// param as `AuthenticatedAdmin` keep compiling. There is one account type
// now; the level on it says what the user may do.
export type AuthenticatedAdmin = AuthenticatedUser;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: unknown }>();
    return request.user;
  },
);
