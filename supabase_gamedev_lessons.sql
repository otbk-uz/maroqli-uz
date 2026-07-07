-- Create gamedev_lessons table
CREATE TABLE IF NOT EXISTS public.gamedev_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    level TEXT NOT NULL,
    img TEXT NOT NULL,
    video_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gamedev_lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to lessons" ON public.gamedev_lessons;
DROP POLICY IF EXISTS "Allow admins to modify lessons" ON public.gamedev_lessons;

-- Create policy for public read access
CREATE POLICY "Allow public read access to lessons" ON public.gamedev_lessons
    FOR SELECT USING (true);

-- Create policy for admin write access
CREATE POLICY "Allow admins to modify lessons" ON public.gamedev_lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );
