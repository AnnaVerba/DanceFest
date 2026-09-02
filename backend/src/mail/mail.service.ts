import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { DEFAULT_MAIL_FROM_NAME } from './mail.constants';

interface JudgeCredentialsEmail {
  to: string;
  judgeName: string;
  competitionName: string;
  tempPassword: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private warnedMissingConfig = false;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const user = this.config.get<string>('GMAIL_USER');
    const pass = this.config.get<string>('GMAIL_APP_PASSWORD');
    if (!user || !pass) {
      if (!this.warnedMissingConfig) {
        this.logger.warn(
          'GMAIL_USER / GMAIL_APP_PASSWORD не задані — листи не надсилаються, лише логуються.',
        );
        this.warnedMissingConfig = true;
      }
      return null;
    }

    this.transporter = createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendJudgeTempPassword({
    to,
    judgeName,
    competitionName,
    tempPassword,
  }: JudgeCredentialsEmail): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) return false;

    const fromName =
      this.config.get<string>('MAIL_FROM_NAME') ?? DEFAULT_MAIL_FROM_NAME;
    const fromUser = this.config.get<string>('GMAIL_USER');

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromUser}>`,
        to,
        subject: `Доступ судді — ${competitionName}`,
        text: [
          `Вітаємо, ${judgeName}!`,
          '',
          `Вас додано суддею конкурсу «${competitionName}».`,
          '',
          `Email для входу: ${to}`,
          `Тимчасовий пароль: ${tempPassword}`,
          '',
          'Пароль дійсний для першого входу — увійдіть якнайшвидше.',
        ].join('\n'),
        html: [
          `<p>Вітаємо, ${judgeName}!</p>`,
          `<p>Вас додано суддею конкурсу «${competitionName}».</p>`,
          `<p>Email для входу: <strong>${to}</strong><br>`,
          `Тимчасовий пароль: <strong>${tempPassword}</strong></p>`,
          '<p>Пароль дійсний для першого входу — увійдіть якнайшвидше.</p>',
        ].join('\n'),
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Не вдалося надіслати лист судді ${to}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
