-- Fix column 'format' constraint by setting a default value '5v5' so it doesn't fail NOT NULL constraint during creation
ALTER TABLE tournaments ALTER COLUMN format SET DEFAULT '5v5';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;

-- Add RLS policies for Admins to create and manage tournaments
CREATE POLICY "Admins can insert tournaments" ON public.tournaments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can update tournaments" ON public.tournaments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can delete tournaments" ON public.tournaments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );
