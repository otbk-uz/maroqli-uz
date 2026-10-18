import crypto from 'crypto';

export interface WlcmCheckoutOptions {
  externalId: string;
  amount: number; // In UZS
  currency?: string;
  description: string;
  returnUrl: string;
  paymentProvider?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

export class WlcmPaymentClient {
  public apiKey: string;
  public apiSecret: string;
  public partnerId: string;
  public baseUrl: string;
  public checkoutBaseUrl: string;
  public isProduction: boolean;

  constructor() {
    this.apiKey = process.env.WLCM_API_KEY || process.env.WLCM_TOKEN || '';
    this.apiSecret = process.env.WLCM_API_SECRET || '';
    this.partnerId = process.env.WLCM_PARTNER_ID || '';

    const envMode = process.env.WLCM_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox');
    this.isProduction = envMode === 'production';

    this.baseUrl = process.env.WLCM_BASE_URL || (
      this.isProduction 
        ? 'https://api.wlcm.uz/api/v1' 
        : 'https://apidev.wlcm.uz/api/v1'
    );

    this.checkoutBaseUrl = process.env.WLCM_CHECKOUT_URL || (
      this.isProduction 
        ? 'https://checkout.wlcm.uz' 
        : 'https://sandbox.wlcm.uz'
    );
  }

  /**
   * Check if minimum required credentials exist
   */
  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.partnerId);
  }

  /**
   * Check if API Secret for cryptographic HMAC verification is configured
   */
  public hasSecret(): boolean {
    return Boolean(this.apiSecret);
  }

  /**
   * Generates HMAC-SHA256 signature for WLCM API requests
   */
  public signRequest(method: string, path: string, bodyObj: any = null) {
    if (!this.apiSecret) {
      throw new Error("WLCM_API_SECRET muhit o'zgaruvchisi kiritilmagan. So'rovni imzolab bo'lmadi.");
    }

    const timestamp = Date.now().toString(); // Unix timestamp in ms
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
    if (!this.isConfigured()) {
      throw new Error("WLCM to'lov tizimi sozlanmagan: WLCM_API_KEY yoki WLCM_PARTNER_ID yetishmayapti.");
    }

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

    // Direct hosted partner checkout URL fallback
    const hostedCheckoutUrl = `${this.checkoutBaseUrl}/checkout/${options.externalId}?partner_id=${encodeURIComponent(this.partnerId)}&token=${encodeURIComponent(this.apiKey)}&amount=${amountTiyin}&payment_provider=${encodeURIComponent(options.paymentProvider || 'payme')}&return_url=${encodeURIComponent(options.returnUrl)}`;

    // If API Secret is available, make authenticated server-to-server POST call
    if (this.hasSecret()) {
      try {
        const headers = this.signRequest("POST", "/api/v1/integrations/checkout", body);
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          const targetUrl = data.checkout_url || data.url || hostedCheckoutUrl;
          return {
            success: true,
            checkoutUrl: targetUrl,
            data
          };
        } else {
          console.warn(`[WLCM API] Checkout creation HTTP status: ${res.status}`);
        }
      } catch (err: any) {
        console.warn("[WLCM API] Server-to-server call notice:", err.message);
      }
    } else {
      console.info("[WLCM Info] WLCM_API_SECRET yo'qligi sababli to'g'ridan-to'g'ri hosted checkout URL ishlatildi.");
    }

    return {
      success: true,
      checkoutUrl: hostedCheckoutUrl,
      hostedDirect: true
    };
  }

  /**
   * Verifies incoming webhook HMAC signature strictly per WLCM specs.
   * If secret is missing or signature mismatch, returns valid = false.
   */
  public verifyWebhookSignature(
    rawBody: string, 
    signature: string, 
    timestamp?: string | null,
    requestPath: string = "/api/payments/wlcm/webhook"
  ): WebhookVerificationResult {
    if (!this.hasSecret()) {
      return { 
        valid: false, 
        reason: "WLCM_API_SECRET muhit o'zgaruvchisi serverda mavjud emas. Xavfsizlik qoidalariga ko'ra to'lov qabul qilinmadi." 
      };
    }

    if (!signature) {
      return { 
        valid: false, 
        reason: "So'rovda x-signature sarlavhasi (header) mavjud emas." 
      };
    }

    // 1. Validate timestamp drift if timestamp header is provided (max 300 seconds)
    if (timestamp) {
      const parsedTs = parseInt(timestamp, 10);
      if (!isNaN(parsedTs)) {
        const driftMs = Math.abs(Date.now() - parsedTs);
        if (driftMs > 300_000) {
          return { 
            valid: false, 
            reason: `X-Timestamp vaqt og'ishi ruxsat etilgan limitdan oshdi (${Math.round(driftMs / 1000)}s > 300s).` 
          };
        }
      }
    }

    const cleanSig = signature.trim().toLowerCase();

    // 2. Format A: Canonical string format (METHOD PATH TIMESTAMP BODY_SHA256)
    if (timestamp) {
      const bodySha256 = crypto.createHash('sha256').update(rawBody).digest('hex');
      const canonicalString1 = `POST ${requestPath} ${timestamp} ${bodySha256}`;
      const canonicalString2 = `POST\n${requestPath}\n${timestamp}\n${bodySha256}`;

      const sigCanonical1 = crypto.createHmac('sha256', this.apiSecret).update(canonicalString1).digest('hex').toLowerCase();
      const sigCanonical2 = crypto.createHmac('sha256', this.apiSecret).update(canonicalString2).digest('hex').toLowerCase();

      if (this.safeCompare(sigCanonical1, cleanSig) || this.safeCompare(sigCanonical2, cleanSig)) {
        return { valid: true };
      }
    }

    // 3. Format B: Direct raw-body HMAC-SHA256
    const sigDirect = crypto.createHmac('sha256', this.apiSecret).update(rawBody).digest('hex').toLowerCase();
    if (this.safeCompare(sigDirect, cleanSig)) {
      return { valid: true };
    }

    return { 
      valid: false, 
      reason: "HMAC-SHA256 imzosi mos kelmadi. So'rov haqiqiy WLCM serveridan kelmagan bo'lishi mumkin." 
    };
  }

  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
}

export const wlcmClient = new WlcmPaymentClient();
