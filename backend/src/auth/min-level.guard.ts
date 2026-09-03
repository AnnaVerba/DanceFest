import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { INSUFFICIENT_ROLE_MESSAGE } from './auth.constants';
import { MIN_LEVEL_KEY } from './min-level.decorator';
import { AccessLevel, meetsLevel } from './access-level.enum';
import type { AuthenticatedUser } from './authenticated-user.interface';

@Injectable()
export class MinLevelGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccessLevel>(
      MIN_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    if (!meetsLevel(request.user.accessLevel, required)) {
      throw new ForbiddenException(INSUFFICIENT_ROLE_MESSAGE);
    }
    return true;
  }
}
