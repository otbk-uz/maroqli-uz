-- 1. developed_games jadvaliga premium_price ustunini qo'shish
ALTER TABLE public.developed_games ADD COLUMN IF NOT EXISTS premium_price NUMERIC NULL;

-- 2. "O'yinlar matematika nazariyasi" pley-listidagi darslarni kiritish
INSERT INTO public.gamedev_lessons (title, author, level, img, video_url) VALUES
('1-Dars: Vektorlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson1.png', 'bunny://2fd0968f-c297-4ae3-80da-cc8fd22584d1'),
('2-Dars: Sinus to''lqinlari', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson2.png', 'bunny://932de42f-f19a-416b-9b3f-c6bce0dbaf2a'),
('3-Dars: Kuchlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson3.png', 'bunny://1164decd-bbd9-4854-a236-87cfc7aafc88')
ON CONFLICT DO NOTHING;

-- 3. STK SUPERTUXKART o'yinini do'konga qo'shish
DO $$
DECLARE
    dev_id UUID;
BEGIN
    SELECT id INTO dev_id FROM public.profiles WHERE role = 'ADMIN' OR role = 'GAMEDEV' LIMIT 1;
    IF dev_id IS NULL THEN
        SELECT id INTO dev_id FROM public.profiles LIMIT 1;
    END IF;
    
    IF dev_id IS NOT NULL THEN
        INSERT INTO public.developed_games (developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, download_url)
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
            '/SuperTuxKart-1.5-setup.exe'
        )
        ON CONFLICT (slug) DO NOTHING;
    END IF;
END $$;
