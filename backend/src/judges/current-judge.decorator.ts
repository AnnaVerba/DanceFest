import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedJudge {
  id: string;
  name: string;
  email: string;
  competitionId: string;
}

export const CurrentJudge = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedJudge => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedJudge }>();
    return request.user;
  },
);
