-- Death Mine o'yinini @furqatjon_b nomidan do'konga 9,900 UZS narxda qo'shish
DO $$
DECLARE
    dev_id UUID;
BEGIN
    SELECT id INTO dev_id FROM public.profiles WHERE username = 'furqatjon_b' OR lower(username) = 'furqatjon_b' LIMIT 1;
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
            'Death Mine',
            'death-mine',
            9900,
            7900,
            'PC',
            'Qorong''u va xavfli ma''dan konlarida omon qolish va sarguzasht! Death Mine — maruzli va qorong''u mistik kon ichida dahshatli mavjudotlarga qarshi kurashish hamda kon sirlarini oshkor qilishga asoslangan Unity 3D fantastik sarguzasht va horror o''yini. Kon tubiga tushing, resurslarni yig''ing va tirik qoling!

O''yinda ajoyib vizual va ovoz effektlari, dahshatli atmosfera hamda murakkab jumboqlar mavjud.',
            'O''zbek, Ingliz',
            'OS: Windows 10/11 (64-bit), RAM: 8GB, GPU: NVIDIA GeForce GTX 1050 / AMD Radeon RX 560, HDD/SSD: 2GB bo''sh joy',
            '/Death-Mine.zip',
            '/death_mine_cover.png',
            'Death Mine.exe',
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
