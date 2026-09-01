import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { INSUFFICIENT_ROLE_MESSAGE } from './auth.constants';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';
import type { AuthenticatedUser } from './authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    if (!requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException(INSUFFICIENT_ROLE_MESSAGE);
    }
    return true;
  }
}
