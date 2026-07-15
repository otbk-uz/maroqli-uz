-- 1. developed_games jadvaliga premium_price va cover ustunlarini qo'shish
ALTER TABLE public.developed_games ADD COLUMN IF NOT EXISTS premium_price NUMERIC NULL;
ALTER TABLE public.developed_games ADD COLUMN IF NOT EXISTS cover TEXT NULL;

-- 2. Darsliklar jadvalini tozalash (xatoliklarni to'liq bartaraf etish uchun)
DELETE FROM public.gamedev_lessons;

-- 3. Barcha darsliklarni (6 ta original va 3 ta yangi matematika) boshidan toza holatda kiritish
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

-- 4. STK SUPERTUXKART o'yinini do'konga qo'shish yoki yangilash
DO $$
DECLARE
    dev_id UUID;
BEGIN
    SELECT id INTO dev_id FROM public.profiles WHERE role = 'ADMIN' OR role = 'GAMEDEV' LIMIT 1;
    IF dev_id IS NULL THEN
        SELECT id INTO dev_id FROM public.profiles LIMIT 1;
    END IF;
    
    IF dev_id IS NOT NULL THEN
        INSERT INTO public.developed_games (developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, download_url, cover)
        VALUES (
            dev_id,
            'STK SUPERTUXKART',
            'stk-supertuxkart',
            15000,
            10000,
            'PC',
            'Talismanlar Qirolligiga xush kelibsiz! Karting. Tezlik. Hayajon! SuperTuxKart - bu turli xil personajlar, treklar va o''yin rejimlariga ega ochiq kodli 3D arkad poyga o''yini. Bizning maqsadimiz realistikdan ko''ra qiziqarliroq va barcha yoshdagilar uchun mos bo''lgan o''yin yaratishdir.

Hikoya rejimida siz yovuz Nolokka duch kelishingiz va uni mag''lub etib, Talisman Qirolligini qo''lga kiritishingiz kerak! Siz kompyuterga qarshi poyga qilishingiz, bir nechta Gran-pri kuboklarida ishtirok etishingiz yoki Vaqt sinovi rejimida eng tezkor vaqtingizni bosib o''tishga harakat qilishingiz mumkin. Shuningdek, siz bitta kompyuterda sakkiztagacha do''stingiz bilan poyga qilishingiz, jang qilishingiz yoki futbol o''ynashingiz, mahalliy tarmoq orqali o''ynashingiz yoki butun dunyo bo''ylab boshqa o''yinchilar bilan onlayn o''ynashingiz mumkin. SuperTuxKart 1.5 oʻyinida 21 ta rasmiy trek va 18 ta rasmiy kartlar mavjud.',
            'Ingliz, Rus, O''zbek',
            'OS: Windows 10/11, RAM: 4GB, GPU: Intel HD Graphics',
            '/SuperTuxKart-1.5-setup.exe',
            '/stk_cover.png'
        )
        ON CONFLICT (slug) DO UPDATE SET 
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            premium_price = EXCLUDED.premium_price,
            download_url = EXCLUDED.download_url,
            cover = EXCLUDED.cover;
    END IF;
END $$;
