-- bot_users jadvaliga ticket xarid holatini saqlovchi ustun qo'shish
ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS has_bronze_ticket BOOLEAN DEFAULT FALSE;
