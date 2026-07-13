-- Update existing lessons image fields to local assets
UPDATE public.gamedev_lessons SET img = '/lesson1.png' WHERE title LIKE '1-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson2.png' WHERE title LIKE '2-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson3.png' WHERE title LIKE '3-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson4.png' WHERE title LIKE '4-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson5.png' WHERE title LIKE '5-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson6.png' WHERE title LIKE '6-Dars%';
