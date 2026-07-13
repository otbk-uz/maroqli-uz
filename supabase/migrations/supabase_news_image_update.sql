-- Update existing news articles to point to the new custom generated images
UPDATE public.news 
SET image_url = '/news1.png' 
WHERE id = '436087c6-8a3a-422b-b1ae-3206ba92fec5';

UPDATE public.news 
SET image_url = '/news2.png' 
WHERE id = '1e2321de-05a3-4d3c-bd09-29da871ea32d';
