-- To'lov arizalari (P2P + Chek) uchun jadval
CREATE TABLE payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- 'GAME' yoki 'PREMIUM'
  item_id UUID, -- O'yin UUID (developed_games.id)
  amount NUMERIC NOT NULL,
  receipt_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- PENDING, APPROVED, REJECTED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) faollashtirish
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- 1. Foydalanuvchilar o'z arizalarini ko'rishlari
CREATE POLICY "Users can view their own payment requests."
  ON payment_requests FOR SELECT
  USING ( auth.uid() = user_id );

-- 2. Ro'yxatdan o'tganlar ariza topshirishlari
CREATE POLICY "Authenticated users can submit payment requests."
  ON payment_requests FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

-- 3. Admin barcha arizalarni ko'ra olishi
CREATE POLICY "Admins can view all payment requests."
  ON payment_requests FOR SELECT
  USING ( 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- 4. Admin arizalarni tahrirlay olishi
CREATE POLICY "Admins can update payment requests."
  ON payment_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );
