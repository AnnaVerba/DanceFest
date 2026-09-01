import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedAdmin } from './current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new admin account' })
  @ApiResponse({
    status: 201,
    description: 'Account created; returns an access/refresh token pair.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({
    status: 409,
    description: 'An admin with this email already exists.',
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({
    status: 201,
    description: 'Login successful; returns an access/refresh token pair.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiResponse({
    status: 201,
    description: 'New access/refresh token pair issued.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token is missing, invalid, or expired.',
  })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiOperation({ summary: 'Revoke a refresh token (log out of this session)' })
  @ApiResponse({ status: 204, description: 'Refresh token revoked.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token is missing, invalid, or expired.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @ApiOperation({ summary: 'Get the currently authenticated admin' })
  @ApiResponse({ status: 200, description: 'Current admin profile returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() admin: AuthenticatedAdmin) {
    return admin;
  }
}
