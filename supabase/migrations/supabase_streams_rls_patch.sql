-- 1. Hozirgi qolib ketgan turnir efirlarini to'xtatish (is_live = false)
UPDATE public.live_streams SET is_live = false WHERE game_name = 'TURNIR';

-- 2. RLS yangilash va o'chirish siyosatlarini adminlar uchun ham yo'lga qo'yish
DROP POLICY IF EXISTS "Users can update their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON public.live_streams;

-- Foydalanuvchilar o'z efirini, adminlar esa xohlagan efirni tahrirlay oladi
CREATE POLICY "Users and admins can update streams" ON public.live_streams
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- Foydalanuvchilar o'z efirini, adminlar esa xohlagan efirni o'chira oladi
CREATE POLICY "Users and admins can delete streams" ON public.live_streams
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );
