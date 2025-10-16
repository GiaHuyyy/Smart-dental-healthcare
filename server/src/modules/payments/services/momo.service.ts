import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';

export interface MoMoPaymentRequest {
  orderId: string;
  amount: number;
  orderInfo: string;
  returnUrl: string;
  notifyUrl: string;
  extraData?: string;
  requestType?: 'payWithMethod' | 'captureWallet'; // Default: payWithMethod
  autoCapture?: boolean; // Default: true
  orderGroupId?: string;
}

export interface MoMoPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  deeplink2?: string;
  deeplinkMiniApp?: string;
}

export interface MoMoCallbackData {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

@Injectable()
export class MoMoService {
  private readonly logger = new Logger(MoMoService.name);
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string;

  constructor(private configService: ConfigService) {
    this.partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE') || 'MOMO';
    this.accessKey = this.configService.get<string>('MOMO_ACCESS_KEY') || 'F8BBA842ECF85';
    this.secretKey = this.configService.get<string>('MOMO_SECRET_KEY') || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    this.endpoint = this.configService.get<string>('MOMO_ENDPOINT') || 'https://test-payment.momo.vn';
  }

  /**
   * Tạo chữ ký HMAC SHA256 cho request
   */
  private createSignature(rawSignature: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Tạo payment request đến MoMo
   */
  async createPayment(request: MoMoPaymentRequest): Promise<MoMoPaymentResponse> {
    const requestId = this.partnerCode + new Date().getTime();
    const { 
      orderId, 
      amount, 
      orderInfo, 
      returnUrl, 
      notifyUrl, 
      extraData = '',
      requestType = 'payWithMethod', // Mặc định dùng payWithMethod để hỗ trợ nhiều phương thức
      autoCapture = true,
      orderGroupId = ''
    } = request;

    // Build raw signature theo đúng format của MoMo
    const rawSignature = 
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${notifyUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${this.partnerCode}` +
      `&redirectUrl=${returnUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    this.logger.debug('RAW SIGNATURE:', rawSignature);

    const signature = this.createSignature(rawSignature);
    this.logger.debug('SIGNATURE:', signature);

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'Smart Dental Healthcare',
      storeId: 'SmartDentalStore',
      requestId,
      amount: amount.toString(),
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: 'vi',
      requestType,
      autoCapture,
      extraData,
      orderGroupId,
      signature
    };

    this.logger.log('Creating MoMo payment request:', { orderId, amount, requestType });

    return this.sendHttpsRequest(requestBody);
  }

  /**
   * Verify callback signature từ MoMo
   */
  verifyCallbackSignature(callbackData: MoMoCallbackData): boolean {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = callbackData;

    const rawSignature = 
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSignature = this.createSignature(rawSignature);

    const isValid = expectedSignature === signature;
    
    if (!isValid) {
      this.logger.warn('Invalid MoMo callback signature', {
        orderId,
        expected: expectedSignature,
        received: signature
      });
    }

    return isValid;
  }

  /**
   * Gửi HTTPS request đến MoMo với retry logic
   */
  private async sendHttpsRequest(requestBody: any, retryCount = 0, maxRetries = 3): Promise<MoMoPaymentResponse> {
    const bodyString = JSON.stringify(requestBody);

    const options: https.RequestOptions = {
      hostname: new URL(this.endpoint).hostname,
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString)
      },
      timeout: 30000 // 30s timeout
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        this.logger.debug(`MoMo Response Status: ${res.statusCode}`);
        
        res.setEncoding('utf8');
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            this.logger.log('MoMo Response:', response);

            if (response.resultCode === 0) {
              resolve(response);
            } else {
              // Map MoMo error codes to Vietnamese messages
              const errorMessage = this.getMoMoErrorMessage(response.resultCode);
              this.logger.error('MoMo Error:', { 
                resultCode: response.resultCode, 
                message: response.message,
                vietnameseMessage: errorMessage 
              });
              reject(new Error(errorMessage));
            }
          } catch (error) {
            this.logger.error('Failed to parse MoMo response:', error);
            reject(new Error('Không thể xử lý phản hồi từ MoMo. Vui lòng thử lại.'));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const error = new Error('MoMo request timeout');
        
        // Retry on timeout
        if (retryCount < maxRetries) {
          this.logger.warn(`MoMo timeout, retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            this.sendHttpsRequest(requestBody, retryCount + 1, maxRetries)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1)); // Exponential backoff
        } else {
          this.logger.error('MoMo Request Timeout after retries');
          reject(new Error('Kết nối đến MoMo quá lâu. Vui lòng thử lại sau.'));
        }
      });

      req.on('error', (error) => {
        this.logger.error('MoMo Request Error:', error);
        
        // Retry on network errors
        if (retryCount < maxRetries && error.message.includes('ECONNREFUSED')) {
          this.logger.warn(`Network error, retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            this.sendHttpsRequest(requestBody, retryCount + 1, maxRetries)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1));
        } else {
          reject(new Error('Không thể kết nối đến MoMo. Vui lòng kiểm tra kết nối mạng.'));
        }
      });

      req.write(bodyString);
      req.end();
    });
  }

  /**
   * Map MoMo error codes to Vietnamese messages
   */
  private getMoMoErrorMessage(resultCode: number): string {
    const errorMessages: Record<number, string> = {
      9000: 'Giao dịch đã được xác nhận thành công',
      1000: 'Giao dịch đã được khởi tạo, chờ người dùng xác nhận thanh toán',
      1001: 'Giao dịch thất bại do lỗi phía người dùng',
      1002: 'Giao dịch bị từ chối bởi nhà phát hành',
      1003: 'Đã hủy giao dịch',
      1004: 'Giao dịch thất bại do số tiền vượt quá hạn mức thanh toán',
      1005: 'Giao dịch thất bại do URL hoặc QR code đã hết hạn',
      1006: 'Giao dịch thất bại do người dùng từ chối xác nhận thanh toán',
      1007: 'Giao dịch bị từ chối vì tài khoản đã bị đóng',
      2001: 'Giao dịch thất bại do sai thông tin',
      3001: 'Số dư ví không đủ để thanh toán',
      3002: 'Tài khoản bị khóa',
      3003: 'Tài khoản chưa được kích hoạt',
      3004: 'Tài khoản không tồn tại',
      4001: 'Giao dịch bị từ chối do vượt quá số lần nhập mã OTP',
      4010: 'OTP không hợp lệ',
      4011: 'OTP hết hạn',
      4100: 'Giao dịch thất bại do người dùng không thực hiện thanh toán',
      10: 'Hệ thống đang bảo trì. Vui lòng thử lại sau.',
      11: 'Truy cập bị từ chối',
      12: 'Phiên bản API không được hỗ trợ',
      13: 'Xác thực merchant thất bại',
      20: 'Lỗi định dạng dữ liệu',
      21: 'Số tiền không hợp lệ',
      40: 'RequestId bị trùng',
      41: 'OrderId bị trùng',
      42: 'OrderId không hợp lệ hoặc không tồn tại',
      43: 'Request bị trùng trong thời gian xử lý',
      99: 'Lỗi không xác định',
    };

    return errorMessages[resultCode] || `Lỗi thanh toán (Mã lỗi: ${resultCode})`;
  }

  /**
   * Query transaction status từ MoMo
   */
  async queryTransaction(orderId: string, requestId: string): Promise<any> {
    const rawSignature = 
      `accessKey=${this.accessKey}` +
      `&orderId=${orderId}` +
      `&partnerCode=${this.partnerCode}` +
      `&requestId=${requestId}`;

    const signature = this.createSignature(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      orderId,
      signature,
      lang: 'vi'
    };

    const bodyString = JSON.stringify(requestBody);

    const options: https.RequestOptions = {
      hostname: new URL(this.endpoint).hostname,
      port: 443,
      path: '/v2/gateway/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(bodyString);
      req.end();
    });
  }
}


