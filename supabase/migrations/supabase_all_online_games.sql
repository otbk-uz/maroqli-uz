-- 43+ HTML5 Onlayn O'yinlarni Supabase developed_games jadvaliga kiritish

DO $$
DECLARE
    dev_id UUID;
BEGIN
    -- GAMEDEV yoki ADMIN roliga ega birinchi profilni topamiz
    SELECT id INTO dev_id FROM public.profiles WHERE role = 'ADMIN' OR role = 'GAMEDEV' LIMIT 1;
    IF dev_id IS NULL THEN
        SELECT id INTO dev_id FROM public.profiles LIMIT 1;
    END IF;

    IF dev_id IS NOT NULL THEN
        -- Aks
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Aks',
            'aks-nusxa',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''aks-nusxa'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/aks-nusxa/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/aks-nusxa/index.html',
            '/games-online/aks-nusxa/covers/aks-nusxa.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🔊 Aks
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🔊 Aks',
            'aks-ovoz',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''aks-ovoz'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/aks-ovoz/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/aks-ovoz/index.html',
            '/games-online/aks-ovoz/covers/aks-ovoz.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Aks
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Aks',
            'aks-sado',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''aks-sado'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/aks-sado/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/aks-sado/index.html',
            '/games-online/aks-sado/covers/aks-sado.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Arqon tortish
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Arqon tortish',
            'arqon',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''arqon'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/arqon/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/arqon/index.html',
            '/games-online/arqon/covers/arqon.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Berkinmachoq
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Berkinmachoq',
            'berkinmachoq',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''berkinmachoq'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/berkinmachoq/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/berkinmachoq/index.html',
            '/games-online/berkinmachoq/covers/berkinmachoq.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Besh tosh
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Besh tosh',
            'besh-tosh',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''besh-tosh'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/besh-tosh/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/besh-tosh/index.html',
            '/games-online/besh-tosh/covers/besh-tosh.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Bir Chiziq
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Bir Chiziq',
            'bir-chiziq',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''bir-chiziq'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/bir-chiziq/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/bir-chiziq/index.html',
            '/games-online/bir-chiziq/covers/bir-chiziq.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🎈 Bir Nafas
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🎈 Bir Nafas',
            'bir-nafas',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''bir-nafas'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/bir-nafas/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/bir-nafas/index.html',
            '/games-online/bir-nafas/covers/bir-nafas.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- BLACKOUT
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'BLACKOUT',
            'blackout',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''blackout'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/blackout/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/blackout/index.html',
            '/games-online/blackout/covers/blackout.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🔵 Bo''linish
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🔵 Bo''linish',
            'bolinish',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''bolinish'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/bolinish/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/bolinish/index.html',
            '/games-online/bolinish/covers/bolinish.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Kim Bo''ri?
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Kim Bo''ri?',
            'bori',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''bori'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/bori/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/bori/index.html',
            '/games-online/bori/covers/bori.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Chillak
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Chillak',
            'chillak',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''chillak'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/chillak/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/chillak/index.html',
            '/games-online/chillak/covers/chillak.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Domino Reaksiya
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Domino Reaksiya',
            'domino',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''domino'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/domino/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/domino/index.html',
            '/games-online/domino/covers/domino.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- EMBER
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'EMBER',
            'ember',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''ember'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/ember/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/ember/index.html',
            '/games-online/ember/covers/ember.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- G''ildirak
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'G''ildirak',
            'gildirak',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''gildirak'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/gildirak/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/gildirak/index.html',
            '/games-online/gildirak/covers/gildirak.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Girdob
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Girdob',
            'girdob',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''girdob'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/girdob/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/girdob/index.html',
            '/games-online/girdob/covers/girdob.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Tirik Naqsh
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Tirik Naqsh',
            'hayot',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''hayot'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/hayot/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/hayot/index.html',
            '/games-online/hayot/covers/hayot.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Ikki Dunyo
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Ikki Dunyo',
            'ikki-dunyo',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''ikki-dunyo'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/ikki-dunyo/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/ikki-dunyo/index.html',
            '/games-online/ikki-dunyo/covers/ikki-dunyo.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🕸️ Ip
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🕸️ Ip',
            'ip',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''ip'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/ip/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/ip/index.html',
            '/games-online/ip/covers/ip.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Klass
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Klass',
            'klass',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''klass'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/klass/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/klass/index.html',
            '/games-online/klass/covers/klass.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Ko''rinmas Yo''l
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Ko''rinmas Yo''l',
            'korinmas',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''korinmas'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/korinmas/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/korinmas/index.html',
            '/games-online/korinmas/covers/korinmas.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Kurash
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Kurash',
            'kurash',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''kurash'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/kurash/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/kurash/index.html',
            '/games-online/kurash/covers/kurash.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Lanka
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Lanka',
            'lanka',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''lanka'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/lanka/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/lanka/index.html',
            '/games-online/lanka/covers/lanka.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🧲 Magnit
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🧲 Magnit',
            'magnit',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''magnit'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/magnit/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/magnit/index.html',
            '/games-online/magnit/covers/magnit.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Mina Maydoni
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Mina Maydoni',
            'mina',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''mina'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/mina/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/mina/index.html',
            '/games-online/mina/covers/mina.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Molekula
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Molekula',
            'molekula',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''molekula'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/molekula/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/molekula/index.html',
            '/games-online/molekula/covers/molekula.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Sirg''anoq Muz
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Sirg''anoq Muz',
            'muz',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''muz'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/muz/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/muz/index.html',
            '/games-online/muz/covers/muz.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Oq terak ko''k terak
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Oq terak ko''k terak',
            'oq-terak',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''oq-terak'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/oq-terak/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/oq-terak/index.html',
            '/games-online/oq-terak/covers/oq-terak.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- ⏪ Orqaga
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '⏪ Orqaga',
            'orqaga',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''orqaga'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/orqaga/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/orqaga/index.html',
            '/games-online/orqaga/covers/orqaga.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Oshiq
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Oshiq',
            'oshiq',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''oshiq'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/oshiq/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/oshiq/index.html',
            '/games-online/oshiq/covers/oshiq.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🌱 O''sish
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🌱 O''sish',
            'osish',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''osish'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/osish/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/osish/index.html',
            '/games-online/osish/covers/osish.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Oyna Zarba
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Oyna Zarba',
            'oyna',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''oyna'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/oyna/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/oyna/index.html',
            '/games-online/oyna/covers/oyna.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Prizma
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Prizma',
            'prizma',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''prizma'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/prizma/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/prizma/index.html',
            '/games-online/prizma/covers/prizma.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Qamal / Drift Bastion
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Qamal (Drift Bastion)',
            'qamal',
            0,
            0,
            'WEB',
            'Drift Bastion — PC UI/UX uslubidagi eng so''nggi va kuchaytirilgan grafikaga ega onlayn arkada va baston himoya o''yini.',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/qamal/index.html',
            '/games-online/qamal/covers/qamal.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Drift Bastion
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Drift Bastion',
            'drift-bastion',
            0,
            0,
            'WEB',
            'Drift Bastion — PC UI/UX uslubidagi eng so''nggi va kuchaytirilgan grafikaga ega onlayn arkada va baston himoya o''yini.',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/drift-bastion/index.html',
            '/games-online/qamal/covers/qamal.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Qatlam
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Qatlam',
            'qatlam',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''qatlam'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/qatlam/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/qatlam/index.html',
            '/games-online/qatlam/covers/qatlam.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Quvlashmachoq
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Quvlashmachoq',
            'quvlashmachoq',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''quvlashmachoq'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/quvlashmachoq/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/quvlashmachoq/index.html',
            '/games-online/quvlashmachoq/covers/quvlashmachoq.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Rang Bosqini
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Rang Bosqini',
            'rang',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''rang'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/rang/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/rang/index.html',
            '/games-online/rang/covers/rang.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Rang Kimyosi
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Rang Kimyosi',
            'rang-kimyo',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''rang-kimyo'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/rang-kimyo/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/rang-kimyo/index.html',
            '/games-online/rang-kimyo/covers/rang-kimyo.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Rang Urushi
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Rang Urushi',
            'rang-urushi',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''rang-urushi'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/rang-urushi/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/rang-urushi/index.html',
            '/games-online/rang-urushi/covers/rang-urushi.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Rezonans
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Rezonans',
            'rezonans',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''rezonans'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/rezonans/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/rezonans/index.html',
            '/games-online/rezonans/covers/rezonans.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Ritm Yugurish
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Ritm Yugurish',
            'ritm',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''ritm'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/ritm/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/ritm/index.html',
            '/games-online/ritm/covers/ritm.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Sakrash arqoni
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Sakrash arqoni',
            'sakrash',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''sakrash'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/sakrash/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/sakrash/index.html',
            '/games-online/sakrash/covers/sakrash.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Sirtmoq
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Sirtmoq',
            'sirtmoq',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''sirtmoq'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/sirtmoq/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/sirtmoq/index.html',
            '/games-online/sirtmoq/covers/sirtmoq.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Soya
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Soya',
            'soya',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''soya'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/soya/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/soya/index.html',
            '/games-online/soya/covers/soya.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Soya Sakrash
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Soya Sakrash',
            'soya-sakrash',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''soya-sakrash'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/soya-sakrash/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/soya-sakrash/index.html',
            '/games-online/soya-sakrash/covers/soya-sakrash.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Soya Shakl
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Soya Shakl',
            'soya-shakl',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''soya-shakl'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/soya-shakl/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/soya-shakl/index.html',
            '/games-online/soya-shakl/covers/soya-shakl.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Soya Teatri
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Soya Teatri',
            'soya-teatri',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''soya-teatri'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/soya-teatri/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/soya-teatri/index.html',
            '/games-online/soya-teatri/covers/soya-teatri.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Toj
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Toj',
            'toj',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''toj'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/toj/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/toj/index.html',
            '/games-online/toj/covers/toj.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- To''p
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'To''p',
            'top-tosh',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''top-tosh'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/top-tosh/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/top-tosh/index.html',
            '/games-online/top-tosh/covers/top-tosh.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🌍 Tortishish
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🌍 Tortishish',
            'tortishish',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''tortishish'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/tortishish/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/tortishish/index.html',
            '/games-online/tortishish/covers/tortishish.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Uch qadah
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Uch qadah',
            'uch-qadah',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''uch-qadah'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/uch-qadah/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/uch-qadah/index.html',
            '/games-online/uch-qadah/covers/uch-qadah.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Vaqt Arvohi
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Vaqt Arvohi',
            'vaqt-arvohi',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''vaqt-arvohi'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/vaqt-arvohi/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/vaqt-arvohi/index.html',
            '/games-online/vaqt-arvohi/covers/vaqt-arvohi.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Varrak Jang
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Varrak Jang',
            'varrak',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''varrak'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/varrak/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/varrak/index.html',
            '/games-online/varrak/covers/varrak.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Vaznsiz To''p
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Vaznsiz To''p',
            'vaznsiz',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''vaznsiz'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/vaznsiz/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/vaznsiz/index.html',
            '/games-online/vaznsiz/covers/vaznsiz.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Xalqa otish
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Xalqa otish',
            'xalqa',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''xalqa'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/xalqa/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/xalqa/index.html',
            '/games-online/xalqa/covers/xalqa.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 💡 Yorug''lik
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '💡 Yorug''lik',
            'yoruglik',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''yoruglik'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/yoruglik/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/yoruglik/index.html',
            '/games-online/yoruglik/covers/yoruglik.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Yulduz
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Yulduz',
            'yulduz',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''yulduz'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/yulduz/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/yulduz/index.html',
            '/games-online/yulduz/covers/yulduz.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Yumronqoziq
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Yumronqoziq',
            'yumronqoziq',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''yumronqoziq'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/yumronqoziq/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/yumronqoziq/index.html',
            '/games-online/yumronqoziq/covers/yumronqoziq.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- 🔗 Zanjir
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            '🔗 Zanjir',
            'zanjir',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''zanjir'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/zanjir/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/zanjir/index.html',
            '/games-online/zanjir/covers/zanjir.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

        -- Zanjir Portlash
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Zanjir Portlash',
            'zanjir-portlash',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''zanjir-portlash'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/zanjir-portlash/).',
            'O''zbek',
            'Brauzer (Chrome, Firefox, Safari, Edge)',
            '/games-online/zanjir-portlash/index.html',
            '/games-online/zanjir-portlash/covers/zanjir-portlash.png'
        ) ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            platform = 'WEB',
            price = 0,
            premium_price = 0,
            description = EXCLUDED.description,
            demo_url = EXCLUDED.demo_url,
            cover = EXCLUDED.cover;

    END IF;
END $$;
