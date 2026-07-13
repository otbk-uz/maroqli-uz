-- Create gamedev_lesson_comments table
CREATE TABLE IF NOT EXISTS public.gamedev_lesson_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.gamedev_lessons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gamedev_lesson_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.gamedev_lesson_comments;
DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON public.gamedev_lesson_comments;
DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.gamedev_lesson_comments;

-- Create policy for public read access
CREATE POLICY "Allow public read access to comments" ON public.gamedev_lesson_comments
    FOR SELECT USING (true);

-- Create policy for authenticated users to insert their own comments
CREATE POLICY "Allow authenticated users to insert comments" ON public.gamedev_lesson_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own comments
CREATE POLICY "Allow users to delete their own comments" ON public.gamedev_lesson_comments
    FOR DELETE USING (auth.uid() = user_id);
