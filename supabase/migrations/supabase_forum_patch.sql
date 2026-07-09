-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX THE FOREIGN KEY RELATIONSHIPS

-- 1. Alter forum_topics author_id to reference profiles(id)
ALTER TABLE forum_topics DROP CONSTRAINT IF EXISTS forum_topics_author_id_fkey;
ALTER TABLE forum_topics ADD CONSTRAINT forum_topics_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Alter forum_replies author_id to reference profiles(id)
ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS forum_replies_author_id_fkey;
ALTER TABLE forum_replies ADD CONSTRAINT forum_replies_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Alter global_chat author_id to reference profiles(id)
ALTER TABLE global_chat DROP CONSTRAINT IF EXISTS global_chat_author_id_fkey;
ALTER TABLE global_chat ADD CONSTRAINT global_chat_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
