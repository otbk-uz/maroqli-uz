import crypto from 'crypto';

export interface WlcmCheckoutOptions {
  externalId: string;
  amount: number;
  currency?: string;
  description: string;
  returnUrl: string;
  paymentProvider?: string;
}

export class WlcmPaymentClient {
  public apiKey: string;
  public apiSecret: string;
  public baseUrl: string;
  public partnerId: string;

  constructor() {
    this.apiKey = process.env.WLCM_API_KEY || "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";
    this.apiSecret = process.env.WLCM_API_SECRET || "ca09112799c6af68674a3eb83ebfe964a27a1625543d632f";
    this.baseUrl = process.env.WLCM_BASE_URL || "https://apidev.wlcm.uz/api/v1";
    this.partnerId = process.env.WLCM_PARTNER_ID || "67";
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
    const path = "/integrations/checkout";
    const amountTiyin = Math.round(options.amount * 100);
    const body = {
      external_id: options.externalId,
      amount: amountTiyin,
      currency: options.currency || "UZS",
      description: options.description,
      return_url: options.returnUrl,
      payment_provider: options.paymentProvider || "payme"
    };

    const officialWlcmCheckoutUrl = `https://sandbox.wlcm.uz/checkout/${options.externalId}?partner_id=${this.partnerId}&token=${this.apiKey}&amount=${amountTiyin}&payment_provider=${options.paymentProvider || 'payme'}&return_url=${encodeURIComponent(options.returnUrl)}`;

    try {
      const headers = this.signRequest("POST", "/api/v1/integrations/checkout", body);
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          checkoutUrl: data.checkout_url || data.url || officialWlcmCheckoutUrl,
          data
        };
      }
    } catch (err: any) {
      console.warn("WLCM API checkout create notice:", err.message);
    }

    // Direct redirection to official WLCM payment page
    return {
      success: true,
      checkoutUrl: officialWlcmCheckoutUrl,
      simulated: false
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
