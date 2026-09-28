-- Isle of Forgotten Memories o'yinini @XANpro nomidan do'konga qo'shish
DO $$
DECLARE
    dev_id UUID;
BEGIN
    SELECT id INTO dev_id FROM public.profiles WHERE username = 'XANpro' OR lower(username) = 'xanpro' LIMIT 1;
    IF dev_id IS NULL THEN
        SELECT id INTO dev_id FROM public.profiles WHERE role = 'GAMEDEV' LIMIT 1;
    END IF;
    IF dev_id IS NULL THEN
        SELECT id INTO dev_id FROM public.profiles LIMIT 1;
    END IF;
    
    IF dev_id IS NOT NULL THEN
        INSERT INTO public.developed_games (
            developer_id, 
            title, 
            slug, 
            price, 
            premium_price, 
            platform, 
            description, 
            language, 
            sys_requirements, 
            download_url, 
            cover, 
            executable_path,
            rating
        )
        VALUES (
            dev_id,
            'Isle of Forgotten Memories',
            'isle-of-forgotten-memories',
            0,
            0,
            'PC',
            'Sirlarga to''la sirli orol, yo''qolgan xotiralar va unutilgan afsonalar. Isle of Forgotten Memories — Unity 3D vositasida yaratilgan, yuqori grafikali va sarguzashtga boy 3D fantastik o''yin. Orolni kashf eting, jumboqlarni yeching va qorong''u sirlarni oshkor qiling!

O''yinda ajoyib vizual effektlar, sarguzashtli syujet va yuqori atmosferaga ega soundtrack mavjud. Maroqli.uz platformasidan mutlaqo bepul yuklab olishingiz mumkin.',
            'O''zbek, Ingliz',
            'OS: Windows 10/11 (64-bit), RAM: 8GB, GPU: NVIDIA GeForce GTX 1050 / AMD Radeon RX 560, HDD/SSD: 3GB bo''sh joy',
            '/Isle-of-Forgotten-Memories.rar',
            '/isle_of_forgotten_memories_cover.png',
            'Isle of Forgotten Memories.exe',
            5.0
        )
        ON CONFLICT (slug) DO UPDATE SET 
            developer_id = EXCLUDED.developer_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            premium_price = EXCLUDED.premium_price,
            platform = EXCLUDED.platform,
            language = EXCLUDED.language,
            sys_requirements = EXCLUDED.sys_requirements,
            download_url = EXCLUDED.download_url,
            cover = EXCLUDED.cover,
            executable_path = EXCLUDED.executable_path,
            rating = EXCLUDED.rating;
    END IF;
END $$;
