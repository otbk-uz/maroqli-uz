-- Jonli Efir (Live Streams) uchun Jadvallar

-- 1. live_streams jadvali
CREATE TABLE IF NOT EXISTS public.live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Yangi jonli efir',
    game_name TEXT,
    stream_key TEXT UNIQUE NOT NULL,
    stream_url TEXT,
    is_live BOOLEAN DEFAULT false,
    viewers_count INTEGER DEFAULT 0,
    donation_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS siyosatlari
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Hamma o'qiy oladi
CREATE POLICY "Streams are viewable by everyone" ON public.live_streams
    FOR SELECT USING (true);

-- Faqat o'zi tahrirlay oladi
CREATE POLICY "Users can insert their own streams" ON public.live_streams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streams" ON public.live_streams
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streams" ON public.live_streams
    FOR DELETE USING (auth.uid() = user_id);

-- 2. stream_chat jadvali
CREATE TABLE IF NOT EXISTS public.stream_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS siyosatlari
ALTER TABLE public.stream_chat ENABLE ROW LEVEL SECURITY;

-- Hamma o'qiy oladi
CREATE POLICY "Chat is viewable by everyone" ON public.stream_chat
    FOR SELECT USING (true);

-- Avtorizatsiyadan o'tganlar yoza oladi
CREATE POLICY "Authenticated users can insert chat" ON public.stream_chat
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to handle timestamp update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_streams_modtime
    BEFORE UPDATE ON public.live_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
