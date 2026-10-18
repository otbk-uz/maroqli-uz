-- ==========================================================
--  MAROQLI.uz — WLCM To'lov Tizimi Migratsiyasi (2026-10-18)
--  Ushbu fayl faqat tayyorlandi, tasdiqlamasdan qo'llanmaydi.
-- ==========================================================

-- 1. payment_requests jadvaliga WLCM uchun qo'shimcha maydonlar qo'shish (agar mavjud bo'lmasa)
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS order_id VARCHAR(120) UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'WLCM',
  ADD COLUMN IF NOT EXISTS plan_key VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Idempotent qidiruv va tezkor webhook qidiruvi uchun indekslar
CREATE INDEX IF NOT EXISTS idx_payment_requests_order_id ON public.payment_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_status ON public.payment_requests(user_id, status);

-- 3. profiles jadvalida premium_expires_at mavjudligini ta'minlash
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;
