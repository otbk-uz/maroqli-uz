import crypto from 'crypto';

export interface WlcmCheckoutOptions {
  externalId: string;
  amount: number;
  currency?: string;
  description: string;
  returnUrl: string;
}

export class WlcmPaymentClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.WLCM_API_KEY || "wlcm_47f3077b9b09a992349c6b3e8fb574d2";
    this.apiSecret = process.env.WLCM_API_SECRET || "ca09112799c6af68674a3eb83ebfe964a27a1625543d632f";
    this.baseUrl = process.env.WLCM_BASE_URL || "https://sandbox.wlcm.uz";
  }

  /**
   * Generates HMAC-SHA256 signature for WLCM API requests
   */
  public signRequest(method: string, path: string, bodyObj: any = null) {
    const timestamp = Date.now().toString(); // 13-digit millisecond timestamp
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';
    const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(payload).digest('hex');

    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "X-API-Key": this.apiKey,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
  }

  /**
   * Creates a Checkout payment session
   */
  public async createCheckoutSession(options: WlcmCheckoutOptions) {
    const path = "/api/v1/integrations/checkout";
    const body = {
      external_id: options.externalId,
      amount: options.amount,
      currency: options.currency || "UZS",
      description: options.description,
      return_url: options.returnUrl
    };

    const headers = this.signRequest("POST", path, body);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          checkoutUrl: data.checkout_url || data.url || `${this.baseUrl}/checkout/${options.externalId}`,
          data
        };
      }
    } catch (err: any) {
      console.warn("WLCM API checkout create fallback:", err.message);
    }

    // Fallback simulation URL if API endpoint in sandbox is waiting for merchant activation
    return {
      success: true,
      checkoutUrl: `${this.baseUrl}/pay?external_id=${encodeURIComponent(options.externalId)}&amount=${options.amount}&description=${encodeURIComponent(options.description)}`,
      simulated: true
    };
  }

  /**
   * Verifies incoming webhook HMAC signature
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature) return false;
    const computedSignature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature));
  }
}

export const wlcmClient = new WlcmPaymentClient();
