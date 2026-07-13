-- Cloudflare Stream uchun yangi ustunlar qo'shish
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS rtmp_url TEXT DEFAULT 'rtmps://live.cloudflare.com:443/live/',
  ADD COLUMN IF NOT EXISTS cf_live_input_id TEXT;
