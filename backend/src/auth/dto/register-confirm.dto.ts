import { IntersectionType, PickType } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';
import { OtpVerifyDto } from './otp-verify.dto';

// Registration step 2: the same form data as step 1 plus the SMS code.
// The account is created only once the code checks out.
export class RegisterConfirmDto extends IntersectionType(
  RegisterDto,
  PickType(OtpVerifyDto, ['code'] as const),
) {}
