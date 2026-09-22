import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './sms-provider.interface';
import {
  SMS_FLY_API_KEY_ENV,
  SMS_FLY_API_URL_ENV,
  SMS_FLY_FROM_ENV,
  SMS_NOT_CONFIGURED_MESSAGE,
} from './sms.constants';

interface SmsFlyResponse {
  success: number;
  data?: {
    messageID?: string;
    sms?: {
      status?: string;
    };
  };
  error?: {
    code?: string;
    description?: string;
  };
}

@Injectable()
export class SmsFlyProvider implements SmsProvider {
  private readonly logger = new Logger(SmsFlyProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, message: string): Promise<void> {
    const apiKey = this.config.get<string>(SMS_FLY_API_KEY_ENV);
    const from = this.config.get<string>(SMS_FLY_FROM_ENV);
    const apiUrl = this.config.get<string>(SMS_FLY_API_URL_ENV);

    if (!apiKey || !from || !apiUrl) {
      this.logger.error(SMS_NOT_CONFIGURED_MESSAGE);

      throw new ServiceUnavailableException('SMS provider is not configured');
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: {
            key: apiKey,
          },
          action: 'SENDMESSAGE',
          data: {
            recipient: to.replace(/^\+/, ''),
            channels: ['sms'],
            sms: {
              source: from,
              ttl: 5,
              text: message,
            },
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      // Read the response body only once.
      const responseBody = await response.text();

      let result: SmsFlyResponse;

      try {
        result = JSON.parse(responseBody) as SmsFlyResponse;
      } catch {
        this.logger.error(
          `SMS-fly returned invalid JSON. HTTP ${response.status}`,
        );

        throw new Error('Invalid SMS-fly response');
      }

      // Handle HTTP errors and API-level errors.
      if (!response.ok || result.success !== 1) {
        this.logger.error(
          `SMS-fly request failed. HTTP ${response.status}, ` +
            `code: ${result.error?.code ?? 'UNKNOWN'}, ` +
            `description: ${result.error?.description ?? 'Unknown error'}`,
        );

        throw new Error(
          `SMS-fly error: ${result.error?.code ?? response.status}`,
        );
      }

      // ACCEPTD means the provider accepted the SMS for processing.
      if (result.data?.sms?.status !== 'ACCEPTD') {
        this.logger.error(
          `SMS-fly unexpected status: ${result.data?.sms?.status ?? 'UNKNOWN'}`,
        );

        throw new Error('SMS was not accepted by SMS-fly');
      }

      this.logger.log(`SMS accepted by SMS-fly: ${result.data?.messageID}`);
    } catch (error) {
      this.logger.error(
        'Невдалося надіслати SMS ',
        error instanceof Error ? error.stack : String(error),
      );

      throw new ServiceUnavailableException(
        'SMS service тимчасово недоступна. Спробуйте пізніше або зверніться до адміністратора.',
      );
    }
  }
}
