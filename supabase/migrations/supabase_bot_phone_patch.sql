-- bot_users va bot_states jadvallariga telefon raqami ustunini qo'shish
ALTER TABLE bot_users ADD COLUMN phone_number TEXT NULL;
ALTER TABLE bot_states ADD COLUMN phone_number TEXT NULL;
