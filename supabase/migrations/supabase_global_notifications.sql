-- Create a table for global site notifications (e.g. Streams going live)
CREATE TABLE IF NOT EXISTS global_notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Security) settings
ALTER TABLE global_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read global notifications
DROP POLICY IF EXISTS "Global notifications are viewable by everyone" ON global_notifications;
CREATE POLICY "Global notifications are viewable by everyone" ON global_notifications FOR SELECT USING (true);

-- Only authenticated users (or service role) can insert
DROP POLICY IF EXISTS "Authenticated users can insert global notifications" ON global_notifications;
CREATE POLICY "Authenticated users can insert global notifications" ON global_notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable Realtime for the table so users get instant alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'global_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE global_notifications;
  END IF;
END
$$;
