import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Role } from './roles.enum';

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: Role.ADMIN;
}

// The factory's return type isn't enforced against the annotated parameter
// type at call sites, so callers simply declare the type they expect
// (AuthenticatedAdmin for existing admin-only routes, AuthenticatedUser for
// the role-aware routes) and this decorator hands back whatever the guard
// put on the request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: unknown }>();
    return request.user;
  },
);
