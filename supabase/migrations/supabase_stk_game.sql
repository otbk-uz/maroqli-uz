-- 1. developed_games jadvaliga premium_price va cover ustunlarini qo'shish
ALTER TABLE public.developed_games ADD COLUMN IF NOT EXISTS premium_price NUMERIC NULL;
ALTER TABLE public.developed_games ADD COLUMN IF NOT EXISTS cover TEXT NULL;

-- 2. STK SUPERTUXKART o'yinini do'konga qo'shish yoki yangilash
DO $$
DECLARE
    dev_id UUID;
BEGIN
    SELECT id INTO dev_id FROM public.profiles WHERE role = 'ADMIN' OR role = 'GAMEDEV' LIMIT 1;
    IF dev_id IS NULL THEN
        SELECT id INTO dev_id FROM public.profiles LIMIT 1;
    END IF;
    
    IF dev_id IS NOT NULL THEN
        INSERT INTO public.developed_games (developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, download_url, cover, executable_path)
        VALUES (
            dev_id,
            'STK SUPERTUXKART',
            'stk-supertuxkart',
            0,
            0,
            'PC',
            'Talismanlar Qirolligiga xush kelibsiz! Karting. Tezlik. Hayajon! SuperTuxKart - bu turli xil personajlar, treklar va o''yin rejimlariga ega ochiq kodli 3D arkad poyga o''yini. Bizning maqsadimiz realistikdan ko''ra qiziqarliroq va barcha yoshdagilar uchun mos bo''lgan o''yin yaratishdir.

Hikoya rejimida siz yovuz Nolokka duch kelishingiz va uni mag''lub etib, Talisman Qirolligini qo''lga kiritishingiz kerak! Siz kompyuterga qarshi poyga qilishingiz, bir nechta Gran-pri kuboklarida ishtirok etishingiz yoki Vaqt sinovi rejimida eng tezkor vaqtingizni bosib o''tishga harakat qilishingiz mumkin. Shuningdek, siz bitta kompyuterda sakkiztagacha do''stingiz bilan poyga qilishingiz, jang qilishingiz yoki futbol o''ynashingiz, mahalliy tarmoq orqali o''ynashingiz yoki butun dunyo bo''ylab boshqa o''yinchilar bilan onlayn o''ynashingiz mumkin. SuperTuxKart 1.5 oʻyinida 21 ta rasmiy trek va 18 ta rasmiy kartlar mavjud.',
            'Ingliz, Rus, O''zbek',
            'OS: Windows 10/11, RAM: 4GB, GPU: Intel HD Graphics',
            '/SuperTuxKart-1.5-setup.exe',
            '/stk_cover.png',
            'supertuxkart.exe'
        )
        ON CONFLICT (slug) DO UPDATE SET 
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            premium_price = EXCLUDED.premium_price,
            download_url = EXCLUDED.download_url,
            cover = EXCLUDED.cover,
            executable_path = EXCLUDED.executable_path;
    END IF;
END $$;
