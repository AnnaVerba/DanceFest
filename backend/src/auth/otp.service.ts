import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { TwilioVerifyProvider } from '../sms/twilio-verify.provider';
import { OtpSendLog } from './otp-send-log.model';
import {
  ONE_HOUR_MS,
  OTP_HOURLY_LIMIT_MESSAGE,
  OTP_INVALID_OR_EXPIRED_MESSAGE,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_TOO_SOON_MESSAGE,
} from './otp.constants';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpSendLog) private readonly sendLogModel: typeof OtpSendLog,
    private readonly otpProvider: TwilioVerifyProvider,
  ) {}

  async start(phone: string): Promise<void> {
    const now = Date.now();
    const recent = await this.sendLogModel.findAll({
      where: { phone, createdAt: { [Op.gt]: new Date(now - ONE_HOUR_MS) } },
      order: [['createdAt', 'DESC']],
    });
    if (
      recent[0] &&
      now - recent[0].createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        OTP_RESEND_TOO_SOON_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recent.length >= OTP_MAX_SENDS_PER_HOUR) {
      throw new HttpException(
        OTP_HOURLY_LIMIT_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.sendLogModel.create({
      phone,
    } as CreationAttributes<OtpSendLog>);

    await this.otpProvider.start(phone);
  }

  async verify(phone: string, code: string): Promise<void> {
    const approved = await this.otpProvider.check(phone, code);
    if (!approved) {
      throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
    }
  }
}
