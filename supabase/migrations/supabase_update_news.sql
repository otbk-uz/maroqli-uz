-- Yangiliklar sarlavhasi va tarkibidagi eski nomni yangilash
UPDATE news
SET 
  title = REPLACE(title, 'PlayNationUz', 'Maroqli.uz'),
  content = REPLACE(content, 'PlayNationUz', 'Maroqli.uz')
WHERE id = '1e2321de-05a3-4d3c-bd09-29da871ea32d';
