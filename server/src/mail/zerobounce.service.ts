import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailValidationResult {
  isValid: boolean;
  status: string;
  subStatus?: string;
  email: string;
  didYouMean?: string;
  message?: string;
}

@Injectable()
export class ZeroBounceService implements OnModuleInit {
  private readonly logger = new Logger(ZeroBounceService.name);
  private apiKey: string | undefined;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('ZEROBOUNCE_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'ZEROBOUNCE_API_KEY not configured. Email validation will be skipped.',
      );
      return;
    }

    this.isConfigured = true;
    this.logger.log('ZeroBounce service initialized successfully');
  }

  /**
   * Validate email address using ZeroBounce API
   * Only call this for registration (new emails)
   *
   * Valid statuses from ZeroBounce:
   * - valid: Email is valid and deliverable
   * - invalid: Email is not valid
   * - catch-all: Server accepts all emails (risky)
   * - unknown: Unable to determine validity
   * - spamtrap: Known spam trap
   * - abuse: Known abusive email
   * - do_not_mail: Should not be emailed
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    // If API key not configured, skip validation and allow email
    if (!this.isConfigured) {
      this.logger.warn(
        `ZeroBounce not configured, skipping validation for: ${email}`,
      );
      return {
        isValid: true,
        status: 'skipped',
        email,
        message: 'Email validation skipped - API not configured',
      };
    }

    try {
      const url = new URL('https://api.zerobounce.net/v2/validate');
      url.searchParams.append('api_key', this.apiKey as string);
      url.searchParams.append('email', email);
      url.searchParams.append('ip_address', ''); // Optional, can add client IP

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`ZeroBounce API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        status: string;
        sub_status?: string;
        email?: string;
        did_you_mean?: string;
      };

      this.logger.debug(`ZeroBounce result for ${email}: ${data.status}`);

      // Determine if email is valid based on status
      const validStatuses = ['valid'];
      const maybeValidStatuses = ['catch-all', 'unknown']; // Accept these with warning

      const isValid =
        validStatuses.includes(data.status) ||
        maybeValidStatuses.includes(data.status);

      // Build result
      const result: EmailValidationResult = {
        isValid,
        status: data.status,
        subStatus: data.sub_status,
        email: data.email || email,
        didYouMean: data.did_you_mean,
      };

      // Add helpful message based on status
      if (!isValid) {
        switch (data.status) {
          case 'invalid':
            result.message = 'Email không tồn tại hoặc không hợp lệ';
            break;
          case 'spamtrap':
            result.message = 'Email này không được phép sử dụng';
            break;
          case 'abuse':
            result.message = 'Email này đã bị đánh dấu là spam';
            break;
          case 'do_not_mail':
            result.message = 'Email này không thể nhận thư';
            break;
          default:
            result.message = 'Email không hợp lệ';
        }
      }

      // Suggest correction if available
      if (data.did_you_mean) {
        result.message = `Bạn có phải muốn nhập: ${data.did_you_mean}?`;
      }

      return result;
    } catch (error) {
      this.logger.error(`ZeroBounce validation failed for ${email}:`, error);

      // On API error, allow email through but log warning
      return {
        isValid: true,
        status: 'error',
        email,
        message: 'Email validation temporarily unavailable',
      };
    }
  }

  /**
   * Check remaining API credits
   */
  async getCredits(): Promise<number> {
    if (!this.isConfigured) {
      return -1;
    }

    try {
      const url = new URL('https://api.zerobounce.net/v2/getcredits');
      url.searchParams.append('api_key', this.apiKey as string);

      const response = await fetch(url.toString());
      const data = (await response.json()) as { Credits: string };

      this.logger.log(`ZeroBounce credits remaining: ${data.Credits}`);
      return parseInt(data.Credits, 10) || 0;
    } catch (error) {
      this.logger.error('Failed to get ZeroBounce credits:', error);
      return -1;
    }
  }
}
