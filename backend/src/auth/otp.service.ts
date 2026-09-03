import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { SmsService } from '../sms/sms.service';
import { DEV_OTP_CODE } from '../sms/sms.constants';
import { SALT_ROUNDS } from './auth.constants';
import { OtpCode } from './otp-code.model';
import {
  ONE_HOUR_MS,
  OTP_CODE_LENGTH,
  OTP_HOURLY_LIMIT_MESSAGE,
  OTP_INVALID_OR_EXPIRED_MESSAGE,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_MESSAGE_TEMPLATE,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_TOO_SOON_MESSAGE,
  OTP_TTL_MS,
} from './otp.constants';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpCode) private readonly otpModel: typeof OtpCode,
    private readonly smsService: SmsService,
  ) {}

  async start(phone: string): Promise<void> {
    const now = Date.now();
    const recent = await this.otpModel.findAll({
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

    await this.otpModel.update(
      { consumedAt: new Date() },
      { where: { phone, consumedAt: null } },
    );

    const code = this.smsService.isDev()
      ? DEV_OTP_CODE
      : randomInt(0, 10 ** OTP_CODE_LENGTH)
          .toString()
          .padStart(OTP_CODE_LENGTH, '0');

    await this.otpModel.create({
      phone,
      codeHash: await bcrypt.hash(code, SALT_ROUNDS),
      expiresAt: new Date(now + OTP_TTL_MS),
    } as CreationAttributes<OtpCode>);

    await this.smsService.send(
      phone,
      OTP_MESSAGE_TEMPLATE.replace('%code%', code),
    );
  }

  async verify(phone: string, code: string): Promise<void> {
    const row = await this.otpModel.findOne({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });
    if (!row) {
      throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      await row.update({ consumedAt: new Date() });
      throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
    }
    if (!(await bcrypt.compare(code, row.codeHash))) {
      await row.update({ attempts: row.attempts + 1 });
      throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
    }
    await row.update({ consumedAt: new Date() });
  }
}
