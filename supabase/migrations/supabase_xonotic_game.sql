-- Xonotic 0.8.6 o'yinini do'konga qo'shish yoki yangilash
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
            'Xonotic 0.8.6',
            'xonotic-0-8-6',
            15000,
            10000,
            'PC',
            'Shafqatsiz arenalarga xush kelibsiz! Xonotic - bu ochiq kodli, yuqori tezlikdagi birinchi shaxsdan otiladigan (FPS) shooter o''yini. U ajoyib tezlik, turli xil qurollar va turli xil arenalar bilan jihozlangan.

O''yinda Deathmatch, Capture the Flag, Clan Arena va boshqa ko''plab qiziqarli rejimlar mavjud. Xonotic o''yin dunyosining eng mashhur va shiddatli ochiq kodli FPS o''yinlaridan biri hisoblanadi. Uni Maroqli.uz platformasida maxsus hamyonbop narxda xarid qilishingiz mumkin.',
            'Ingliz, Rus',
            'OS: Windows 10/11, RAM: 4GB, GPU: Intel HD Graphics / AMD Radeon',
            '/xonotic-0.8.6.zip',
            '/xonotic_cover.png'
        )
        ON CONFLICT (slug) DO UPDATE SET 
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            premium_price = EXCLUDED.premium_price,
            download_url = EXCLUDED.download_url,
            cover = EXCLUDED.cover;
    END IF;
END $$;
