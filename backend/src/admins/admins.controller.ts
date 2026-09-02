import {
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { SALT_ROUNDS } from '../auth/auth.constants';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ADMIN_EMAIL_ALREADY_EXISTS_MESSAGE } from './admins.constants';

@ApiTags('admins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @ApiOperation({
    summary: 'Create a new admin account',
    description:
      'The only way to create an admin account — public self-registration as ' +
      'ADMIN via /auth/register is refused. Only an existing admin can call this.',
  })
  @ApiResponse({ status: 201, description: 'Admin created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @ApiResponse({
    status: 409,
    description: 'An admin with this email already exists.',
  })
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateAdminDto) {
    const existing = await this.adminsService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(ADMIN_EMAIL_ALREADY_EXISTS_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const admin = await this.adminsService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return { id: admin.id, name: admin.name, email: admin.email };
  }
}
