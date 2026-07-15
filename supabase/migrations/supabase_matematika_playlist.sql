-- 1. Darsliklar jadvalini tozalash (chalkashliklarni to'liq bartaraf etish va noldan tartibli yozish uchun)
DELETE FROM public.gamedev_lessons;

-- 2. Barcha darsliklarni (6 ta original va 3 ta yangi matematika) boshidan toza holatda kiritish
INSERT INTO public.gamedev_lessons (title, author, level, img, video_url) VALUES
-- Original Game Design darslari
('1-Dars: O''yin dizaynining asosiy tamoyillari', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson1.png', 'bunny://f8d26b4f-bdab-4ecd-a249-0dc27dcc0716'),
('2-Dars: O''yinlardagi qiyinchilik', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson2.png', 'bunny://36f9b8b0-3381-4eb6-a9fa-20cc114f39bd'),
('3-Dars: O''yinchini zeriktirmaslik siri - O''yin dizaynida ritm', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson3.png', 'bunny://f5ab09e5-24f9-4c9d-aaf3-3ba84ee176a1'),
('4-Dars: O''yinlarda "syujet" qurish', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson4.png', 'bunny://5b419d65-e9da-4d5e-9a52-c7c4c615e7a5'),
('5-Dars: Jang sahnalarini "nima" qiziqarli qiladi?', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson5.png', 'bunny://42bc9d76-a9f6-4653-b050-158d004dd830'),
('6-Dars: O''yiningizni qanday chiroyli qilish mumkin?', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson6.png', 'bunny://d9ed7392-d9a2-4418-828d-96783bc1c863'),

-- Yangi matematika darslari
('1-Dars: Vektorlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson1.png', 'bunny://2fd0968f-c297-4ae3-80da-cc8fd22584d1'),
('2-Dars: Sinus to''lqinlari', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson2.png', 'bunny://932de42f-f19a-416b-9b3f-c6bce0dbaf2a'),
('3-Dars: Kuchlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson3.png', 'bunny://1164decd-bbd9-4854-a236-87cfc7aafc88');
