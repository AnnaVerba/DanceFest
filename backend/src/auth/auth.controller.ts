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
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { OtpResendDto } from './dto/otp-resend.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './authenticated-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Register a new account (ADMIN, PARTICIPANT, COACH, or ORGANIZER)',
  })
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
    description:
      'An account with this email (or, for the new roles, phone) already exists.',
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Log in; a password-less account gets an SMS code instead',
  })
  @ApiResponse({
    status: 200,
    description:
      'A session, or { otpRequired: true, phone } for a first login.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary: 'First login step 2: verify the SMS code and set the password',
  })
  @ApiResponse({ status: 200, description: 'Returns an access/refresh pair.' })
  @ApiResponse({
    status: 401,
    description: 'The code is wrong, expired, or used up.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('otp/verify')
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @ApiOperation({ summary: 'Resend the SMS login code' })
  @ApiResponse({
    status: 200,
    description: 'Code re-sent; returns the masked phone.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too soon, or the hourly send limit was reached.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('otp/resend')
  resendOtp(@Body() dto: OtpResendDto) {
    return this.authService.resendOtp(dto);
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

  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
