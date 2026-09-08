-- ==========================================
-- MAROQLI.UZ MASTER SUPABASE DATABASE SETUP
-- Generated for new Supabase project migration
-- ==========================================

-- ------------------------------------------
-- File: supabase_all_online_games.sql
-- ------------------------------------------
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

        -- Qamal
        INSERT INTO public.developed_games (
            developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, demo_url, cover
        ) VALUES (
            dev_id,
            'Qamal',
            'qamal',
            0,
            0,
            'WEB',
            'Barcha kerakli fayllar ichida — boshqa hech narsaga bog''liq emas. 1) Ushbu ''qamal'' papkasini saytingizga yuklang (masalan: https://saytingiz.uz/qamal/).',
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

-- ------------------------------------------
-- File: supabase_bot_phone_patch.sql
-- ------------------------------------------
-- bot_users va bot_states jadvallariga telefon raqami ustunini qo'shish
ALTER TABLE bot_users ADD COLUMN phone_number TEXT NULL;
ALTER TABLE bot_states ADD COLUMN phone_number TEXT NULL;

-- ------------------------------------------
-- File: supabase_bot_ticket_patch.sql
-- ------------------------------------------
-- bot_users jadvaliga ticket xarid holatini saqlovchi ustun qo'shish
ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS has_bronze_ticket BOOLEAN DEFAULT FALSE;

-- ------------------------------------------
-- File: supabase_bot_users.sql
-- ------------------------------------------
-- Telegram bot foydalanuvchilari uchun jadval
CREATE TABLE IF NOT EXISTS bot_users (
  telegram_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Telegram bot holatlari (states) jadvali (Serverless mosligi uchun)
CREATE TABLE IF NOT EXISTS bot_states (
  telegram_id TEXT PRIMARY KEY,
  step TEXT NOT NULL,
  full_name TEXT NULL,
  dob TEXT NULL,
  region TEXT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS faollashtirish
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_states ENABLE ROW LEVEL SECURITY;

-- Anonim va autentifikatsiyadan o'tgan foydalanuvchilar o'qishi/yozishi uchun ruxsatlar
CREATE POLICY "Enable all access for service role" ON bot_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON bot_states
  FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------
-- File: supabase_bought_games.sql
-- ------------------------------------------
-- O'yinlar xaridi va kutubxonasi uchun jadval
CREATE TABLE bought_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES developed_games(id) ON DELETE CASCADE,
  cd_key VARCHAR(100) NOT NULL,
  bought_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, game_id)
);

-- RLS qoidalari (Row Level Security)
ALTER TABLE bought_games ENABLE ROW LEVEL SECURITY;

-- 1. Foydalanuvchilar o'z xaridlarini ko'ra olishi
CREATE POLICY "Users can view their own purchases."
  ON bought_games FOR SELECT
  USING ( auth.uid() = user_id );

-- 2. Ro'yxatdan o'tganlar o'yin sotib ola olishi
CREATE POLICY "Authenticated users can buy games."
  ON bought_games FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

-- ------------------------------------------
-- File: supabase_cloudflare_all_playlists.sql
-- ------------------------------------------
-- ==========================================================
-- MAROQLI.uz — Barcha 4 ta Pleylist, Cloudflare Stream Videolari va Yangi Banneringiz
-- ==========================================================

-- 1. Eski darsliklarni tozalash
DELETE FROM public.gamedev_lessons;

-- 2. Barcha 4 ta pleylist darslarini Cloudflare Stream Video ID lari hamda Yangi Rasmlar bilan kiritish
INSERT INTO public.gamedev_lessons (title, author, level, img, video_url, created_at) VALUES

-- Playlist 1: GameDev "0" dan o'rganish
('1-Dars: Kirish va GameDev asoslari (O''yin qanday yaratiladi?)', 'Maroqli.uz', 'GameDev "0" dan o''rganish', '/images/lessons/gamedev.png', 'cloudflare://5ea6794871f988c845f520056f938266', '2026-01-01 00:00:00+00'),
('2-Dars: Skriptlar va kodlash dunyosi (C# / GDScript)', 'Maroqli.uz', 'GameDev "0" dan o''rganish', '/images/lessons/gamedev.png', 'cloudflare://7f07f450e5017c13cd36cb830d27ae4b', '2026-01-02 00:00:00+00'),
('3-Dars: 2D va 3D grafika hamda animatsiyalar', 'Maroqli.uz', 'GameDev "0" dan o''rganish', '/images/lessons/gamedev.png', 'cloudflare://6da1158fa1ce7e93a7020757db0cd46d', '2026-01-03 00:00:00+00'),
('4-Dars: Birinchi 3D o''yinni yaratish va fizikasi', 'Maroqli.uz', 'GameDev "0" dan o''rganish', '/images/lessons/gamedev.png', 'cloudflare://99a9b0bb5fcdcb48c6fd7bc64cca410b', '2026-01-04 00:00:00+00'),
('5-Dars: O''yinni eksport qilish va Maroqli do''konida sotish', 'Maroqli.uz', 'GameDev "0" dan o''rganish', '/images/lessons/gamedev.png', 'cloudflare://e8fa266bbb7834f2214bec7952013876', '2026-01-05 00:00:00+00'),

-- Playlist 2: O'yin dizayni (boshlang'ich)
('1-Dars: O''yin dizaynining asosiy tamoyillari', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/images/lessons/gamedesign.png', 'cloudflare://aa830256ddb49a8d8df4a3800f5aa8e6', '2026-01-06 00:00:00+00'),
('2-Dars: O''yinlardagi qiyinchilik', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/images/lessons/gamedesign.png', 'cloudflare://ab69aedc0e3f7adf434e9d8bd760c8b6', '2026-01-07 00:00:00+00'),
('3-Dars: O''yinchini zeriktirmaslik siri - O''yin dizaynida ritm', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/images/lessons/gamedesign.png', 'cloudflare://1ec8924aa82dbdba2a5b62e9b3a4e0a9', '2026-01-08 00:00:00+00'),

-- Playlist 3: O'yinlar matematika nazariyasi
('1-Dars: Vektorlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/images/lessons/gamemath.png', 'cloudflare://0227f4416dad7974318007a77d7c85db', '2026-01-09 00:00:00+00'),
('2-Dars: Sinus to''lqinlari', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/images/lessons/gamemath.png', 'cloudflare://33972dbb7e690eb5e9bcf31f6e3f408a', '2026-01-10 00:00:00+00'),
('3-Dars: Kuchlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/images/lessons/gamemath.png', 'cloudflare://8bbc33cdd5bee21c5ff6f3952cd5dd1c', '2026-01-11 00:00:00+00'),
('4-Dars: Matritsalar va Transformatsiyalar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/images/lessons/gamemath.png', 'cloudflare://1169039cd2c13e50abd86b6fd073bbe6', '2026-01-12 00:00:00+00'),
('5-Dars: Kvaternionlar va Burilishlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/images/lessons/gamemath.png', 'cloudflare://e0109c50de2878ec123c4779264d13aa', '2026-01-13 00:00:00+00'),

-- Playlist 4: Blender 3D boshlang'ich darslari
('1-Dars: Ishni boshlash', 'Maroqli.uz', 'Blender 3D boshlang''ich darslari', '/images/lessons/blender3d.png', 'cloudflare://5b0c2021a67c417f07426e7e11ede44c', '2026-01-14 00:00:00+00'),
('2-Dars: Modellashtirish', 'Maroqli.uz', 'Blender 3D boshlang''ich darslari', '/images/lessons/blender3d.png', 'cloudflare://76f2a4f0cc7fb9a948afc70a0878b634', '2026-01-15 00:00:00+00'),
('3-Dars: Teksturalash', 'Maroqli.uz', 'Blender 3D boshlang''ich darslari', '/images/lessons/blender3d.png', 'cloudflare://8c56cac167674a20bfa02ff8193f82c6', '2026-01-16 00:00:00+00'),
('4-Dars: Renderlash va eksport qilish', 'Maroqli.uz', 'Blender 3D boshlang''ich darslari', '/images/lessons/blender3d.png', 'cloudflare://a6e6fc85cde93d340b7558156f1d7a41', '2026-01-17 00:00:00+00');

-- ------------------------------------------
-- File: supabase_courses_and_certificates.sql
-- ------------------------------------------
-- SQL Migration: Courses, User Progress, Quizzes, Certificates, and Reviews

-- 1. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'GameDev',
    level TEXT DEFAULT 'Boshlang''ich', -- Boshlang'ich, O'rta, Pro
    cover_img TEXT NOT NULL,
    description TEXT DEFAULT '',
    what_you_will_learn TEXT[] DEFAULT '{}',
    total_lessons INTEGER DEFAULT 5,
    total_duration TEXT DEFAULT '2 soat',
    mentor_name TEXT DEFAULT 'Maroqli',
    mentor_avatar TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Course Progress Table
CREATE TABLE IF NOT EXISTS public.user_course_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    quiz_score INTEGER DEFAULT 5,
    quiz_passed BOOLEAN DEFAULT true,
    completed BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, course_id, lesson_id)
);

-- 3. Course Certificates Table
CREATE TABLE IF NOT EXISTS public.course_certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certificate_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    course_title TEXT NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, course_id)
);

-- 4. Course Reviews Table
CREATE TABLE IF NOT EXISTS public.course_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read courses" ON public.courses;
CREATE POLICY "Allow public read courses" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to read their own progress" ON public.user_course_progress;
DROP POLICY IF EXISTS "Allow users to insert/update their own progress" ON public.user_course_progress;
CREATE POLICY "Allow users to read their own progress" ON public.user_course_progress FOR SELECT USING (true);
CREATE POLICY "Allow users to insert/update their own progress" ON public.user_course_progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public read certificates" ON public.course_certificates;
DROP POLICY IF EXISTS "Allow users to insert certificates" ON public.course_certificates;
CREATE POLICY "Allow public read certificates" ON public.course_certificates FOR SELECT USING (true);
CREATE POLICY "Allow users to insert certificates" ON public.course_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public read reviews" ON public.course_reviews;
DROP POLICY IF EXISTS "Allow authenticated users to write reviews" ON public.course_reviews;
CREATE POLICY "Allow public read reviews" ON public.course_reviews FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to write reviews" ON public.course_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------
-- File: supabase_fix_all_bunny_urls_to_youtube.sql
-- ------------------------------------------
-- Supabase SQL Patch: Barcha bunny:// URL larini ishlaydigan YouTube GameDev darsligiga o'tkazish
UPDATE public.gamedev_lessons
SET video_url = 'https://www.youtube.com/watch?v=n784f18V0aI';

-- ------------------------------------------
-- File: supabase_forum.sql
-- ------------------------------------------
-- Ushbu kodni Supabase proyektidagi SQL Editor bo'limiga kiritib "Run" (ishga tushirish) ni bosing:

-- 1. Forum bo'limlari jadvali
CREATE TABLE forum_sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  topics_count INTEGER DEFAULT 0
);

-- Boshlang'ich (default) bo'limlarni qo'shish
INSERT INTO forum_sections (name, description) VALUES
('Umumiy Suhbat', 'Gaming haqida erkin suhbatlar va muhokamalar'),
('O''yin Yangiliklari', 'O''yinlar olamidagi eng so''nggi xabarlar va relizlar'),
('Xatolar va Yordam', 'O''yinlarda yoki platformada uchragan xatolar va yordam so''rash'),
('Kiber-sport', 'Turnirlar, jamoalar va kiber-sport musobaqalari haqida');

-- 2. Forum mavzulari jadvali
CREATE TABLE forum_topics (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES forum_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Xavfsizlik) sozlamalari
ALTER TABLE forum_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;

-- Bo'limlarni hamma ko'rishi mumkin
CREATE POLICY "Sections are viewable by everyone" ON forum_sections FOR SELECT USING (true);

-- Mavzularni hamma ko'rishi mumkin
CREATE POLICY "Topics are viewable by everyone" ON forum_topics FOR SELECT USING (true);

-- Faqat ro'yxatdan o'tganlar mavzu yoza oladi
CREATE POLICY "Authenticated users can insert topics" ON forum_topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Faqat mavzu egasi o'z mavzusini o'zgartira oladi
CREATE POLICY "Users can update their own topics" ON forum_topics FOR UPDATE USING (auth.uid() = author_id);

-- ------------------------------------------
-- File: supabase_forum_full.sql
-- ------------------------------------------
-- 1. Forum bo'limlari jadvali
CREATE TABLE IF NOT EXISTS forum_sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  topics_count INTEGER DEFAULT 0
);

-- Boshlang'ich (default) bo'limlarni qo'shish (agar bo'sh bo'lsa)
INSERT INTO forum_sections (name, description)
SELECT 'Umumiy Suhbat', 'Gaming haqida erkin suhbatlar va muhokamalar'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 1);

INSERT INTO forum_sections (name, description)
SELECT 'O''yin Yangiliklari', 'O''yinlar olamidagi eng so''nggi xabarlar va relizlar'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 2);

INSERT INTO forum_sections (name, description)
SELECT 'Xatolar va Yordam', 'O''yinlarda yoki platformada uchragan xatolar va yordam so''rash'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 3);

INSERT INTO forum_sections (name, description)
SELECT 'Kiber-sport', 'Turnirlar, jamoalar va kiber-sport musobaqalari haqida'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 4);


-- 2. Forum mavzulari jadvali
CREATE TABLE IF NOT EXISTS forum_topics (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES forum_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Xavfsizlik) sozlamalari (Mavzular)
ALTER TABLE forum_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sections are viewable by everyone" ON forum_sections;
CREATE POLICY "Sections are viewable by everyone" ON forum_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Topics are viewable by everyone" ON forum_topics;
CREATE POLICY "Topics are viewable by everyone" ON forum_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert topics" ON forum_topics;
CREATE POLICY "Authenticated users can insert topics" ON forum_topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own topics" ON forum_topics;
CREATE POLICY "Users can update their own topics" ON forum_topics FOR UPDATE USING (auth.uid() = author_id);


-- 3. Forum izohlari (Muhokama/Replies) jadvali
CREATE TABLE IF NOT EXISTS forum_replies (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Replies)
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Replies are viewable by everyone" ON forum_replies;
CREATE POLICY "Replies are viewable by everyone" ON forum_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert replies" ON forum_replies;
CREATE POLICY "Authenticated users can insert replies" ON forum_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own replies" ON forum_replies;
CREATE POLICY "Users can update their own replies" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete their own replies" ON forum_replies;
CREATE POLICY "Users can delete their own replies" ON forum_replies FOR DELETE USING (auth.uid() = author_id);


-- 4. Jonli Ochiq Chat jadvali (Global Chat)
CREATE TABLE IF NOT EXISTS global_chat (
  id SERIAL PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Global Chat)
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global chat is viewable by everyone" ON global_chat;
CREATE POLICY "Global chat is viewable by everyone" ON global_chat FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can send messages" ON global_chat;
CREATE POLICY "Authenticated users can send messages" ON global_chat FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own messages" ON global_chat;
CREATE POLICY "Users can delete their own messages" ON global_chat FOR DELETE USING (auth.uid() = author_id);

-- Real-time uchun global_chat jadvalini ruxsat etilganlar ro'yxatiga qo'shish
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'global_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE global_chat;
  END IF;
END
$$;

-- ------------------------------------------
-- File: supabase_forum_patch.sql
-- ------------------------------------------
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX THE FOREIGN KEY RELATIONSHIPS

-- 1. Alter forum_topics author_id to reference profiles(id)
ALTER TABLE forum_topics DROP CONSTRAINT IF EXISTS forum_topics_author_id_fkey;
ALTER TABLE forum_topics ADD CONSTRAINT forum_topics_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Alter forum_replies author_id to reference profiles(id)
ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS forum_replies_author_id_fkey;
ALTER TABLE forum_replies ADD CONSTRAINT forum_replies_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Alter global_chat author_id to reference profiles(id)
ALTER TABLE global_chat DROP CONSTRAINT IF EXISTS global_chat_author_id_fkey;
ALTER TABLE global_chat ADD CONSTRAINT global_chat_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ------------------------------------------
-- File: supabase_forum_v2.sql
-- ------------------------------------------
-- 1. Forum izohlari (Muhokama/Replies) jadvali
CREATE TABLE forum_replies (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Replies)
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies are viewable by everyone" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert replies" ON forum_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own replies" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own replies" ON forum_replies FOR DELETE USING (auth.uid() = author_id);

-- 2. Jonli Ochiq Chat jadvali (Global Chat)
CREATE TABLE global_chat (
  id SERIAL PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Global Chat)
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global chat is viewable by everyone" ON global_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON global_chat FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own messages" ON global_chat FOR DELETE USING (auth.uid() = author_id);

-- Real-time uchun global_chat jadvalini ruxsat etilganlar ro'yxatiga qo'shish (Majburiy)
-- Eslatma: Supabase Dashboard'da Database -> Replication -> "global_chat" ga ruxsat berish tavsiya qilinadi, lekin bu ham ishlaydi.
alter publication supabase_realtime add table global_chat;

-- ------------------------------------------
-- File: supabase_game_demo_screenshots_wishlist.sql
-- ------------------------------------------
-- 1. developed_games jadvaliga demo_url va screenshots ustunlarini qo'shish
ALTER TABLE public.developed_games ADD COLUMN IF NOT EXISTS demo_url TEXT NULL;
ALTER TABLE public.developed_games ADD COLUMN IF NOT EXISTS screenshots TEXT[] NULL;

-- 2. game_wishlist ("Xohlayman") jadvalini yaratish
CREATE TABLE IF NOT EXISTS public.game_wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.developed_games(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, game_id)
);

-- RLS yoqish
ALTER TABLE public.game_wishlist ENABLE ROW LEVEL SECURITY;

-- Policy: Har kim o'z wishlist'ini ko'ra oladi
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'game_wishlist' AND policyname = 'Users can view their own wishlist'
    ) THEN
        CREATE POLICY "Users can view their own wishlist"
            ON public.game_wishlist FOR SELECT
            USING ( auth.uid() = user_id );
    END IF;
END $$;

-- Policy: Har kim o'z wishlist'iga o'yin qo'sha oladi
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'game_wishlist' AND policyname = 'Users can add to their own wishlist'
    ) THEN
        CREATE POLICY "Users can add to their own wishlist"
            ON public.game_wishlist FOR INSERT
            WITH CHECK ( auth.uid() = user_id );
    END IF;
END $$;

-- Policy: Har kim o'z wishlist'idan o'yin o'chira oladi
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'game_wishlist' AND policyname = 'Users can remove from their own wishlist'
    ) THEN
        CREATE POLICY "Users can remove from their own wishlist"
            ON public.game_wishlist FOR DELETE
            USING ( auth.uid() = user_id );
    END IF;
END $$;

-- ------------------------------------------
-- File: supabase_game_download_patch.sql
-- ------------------------------------------
-- developed_games jadvaliga o'yin yuklab olish havolasini qo'shish
ALTER TABLE developed_games ADD COLUMN download_url TEXT NULL;

-- ------------------------------------------
-- File: supabase_game_executable_patch.sql
-- ------------------------------------------
-- developed_games jadvaliga o'yinning asosiy fayl nomini (.exe) qo'shish
ALTER TABLE developed_games ADD COLUMN executable_path TEXT NULL;

-- ------------------------------------------
-- File: supabase_game_files_limit_patch.sql
-- ------------------------------------------
-- O'yin fayllarini yuklash uchun game_files bucket hajmini 10GB (10 * 1024 * 1024 * 1024 bytes) gacha oshirish
UPDATE storage.buckets 
SET file_size_limit = 10737418240 
WHERE id = 'game_files';

-- ------------------------------------------
-- File: supabase_game_files_storage_policy_patch.sql
-- ------------------------------------------
-- Storage game_files bucket hajmi va RLS siyosatlarini to'liq sozlash
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('game_files', 'game_files', true, 10737418240)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 10737418240;

-- RLS siyosatlari
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for Game Files') THEN
    CREATE POLICY "Public Access for Game Files" ON storage.objects FOR SELECT USING (bucket_id = 'game_files');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload Access for Game Files') THEN
    CREATE POLICY "Authenticated Upload Access for Game Files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game_files' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Update Access for Game Files') THEN
    CREATE POLICY "Authenticated Update Access for Game Files" ON storage.objects FOR UPDATE USING (bucket_id = 'game_files' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Delete Access for Game Files') THEN
    CREATE POLICY "Authenticated Delete Access for Game Files" ON storage.objects FOR DELETE USING (bucket_id = 'game_files' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- ------------------------------------------
-- File: supabase_game_reviews.sql
-- ------------------------------------------
-- O'yinlar uchun izohlar va sharhlar jadvali
CREATE TABLE game_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES developed_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari
ALTER TABLE game_reviews ENABLE ROW LEVEL SECURITY;

-- 1. Hamma izohlarni ko'ra oladi
CREATE POLICY "Public reviews are viewable by everyone."
  ON game_reviews FOR SELECT
  USING ( true );

-- 2. Faqat ro'yxatdan o'tganlar izoh yoza oladi
CREATE POLICY "Authenticated users can insert reviews."
  ON game_reviews FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

-- 3. Foydalanuvchi o'z izohini o'chira oladi
CREATE POLICY "Users can delete their own reviews."
  ON game_reviews FOR DELETE
  USING ( auth.uid() = user_id );

-- 4. Foydalanuvchi o'z izohini tahrirlay oladi
CREATE POLICY "Users can update their own reviews."
  ON game_reviews FOR UPDATE
  USING ( auth.uid() = user_id );

-- ------------------------------------------
-- File: supabase_gamedev.sql
-- ------------------------------------------
-- O'yinlar do'koni uchun jadval (GameDev)
CREATE TABLE developed_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC DEFAULT 0,
  platform TEXT DEFAULT 'PC',
  description TEXT NOT NULL,
  language TEXT,
  sys_requirements TEXT,
  sales_count INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari
ALTER TABLE developed_games ENABLE ROW LEVEL SECURITY;

-- 1. Hamma o'yinlarni ko'ra oladi
CREATE POLICY "Public games are viewable by everyone."
  ON developed_games FOR SELECT
  USING ( true );

-- 2. Dasturchilar (GAMEDEV) o'yin yuklay oladi
CREATE POLICY "Developers can insert their own games."
  ON developed_games FOR INSERT
  WITH CHECK ( auth.uid() = developer_id );

-- 3. Dasturchilar o'z o'yinlarini tahrirlay oladi
CREATE POLICY "Developers can update their own games."
  ON developed_games FOR UPDATE
  USING ( auth.uid() = developer_id );

-- 4. Dasturchilar o'z o'yinlarini o'chira oladi
CREATE POLICY "Developers can delete their own games."
  ON developed_games FOR DELETE
  USING ( auth.uid() = developer_id );

-- ------------------------------------------
-- File: supabase_gamedev_0dan_organish.sql
-- ------------------------------------------
-- GameDev 0dan o'rganish pleylisti uchun darslarni qo'shish
INSERT INTO public.gamedev_lessons (title, author, level, img, video_url) VALUES
('1-Dars: Kirish va gamedev asoslari', 'Uz1games', 'GameDev 0dan o''rganish', '/gamedev_lesson1.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('2-Dars: Skriptlar va kodlash dunyosi', 'Uz1games', 'GameDev 0dan o''rganish', '/gamedev_lesson2.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('3-Dars: 2D va 3D grafika hamda animatsiyalar', 'Uz1games', 'GameDev 0dan o''rganish', '/gamedev_lesson3.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('4-Dars: Birinchi o''yinni yaratish', 'Uz1games', 'GameDev 0dan o''rganish', '/gamedev_lesson4.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('5-Dars: O''yinni eksport qilish va nashr etish', 'Uz1games', 'GameDev 0dan o''rganish', '/gamedev_lesson5.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8');

-- ------------------------------------------
-- File: supabase_gamedev_lesson_comments.sql
-- ------------------------------------------
-- Create gamedev_lesson_comments table
CREATE TABLE IF NOT EXISTS public.gamedev_lesson_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.gamedev_lessons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gamedev_lesson_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.gamedev_lesson_comments;
DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON public.gamedev_lesson_comments;
DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.gamedev_lesson_comments;

-- Create policy for public read access
CREATE POLICY "Allow public read access to comments" ON public.gamedev_lesson_comments
    FOR SELECT USING (true);

-- Create policy for authenticated users to insert their own comments
CREATE POLICY "Allow authenticated users to insert comments" ON public.gamedev_lesson_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own comments
CREATE POLICY "Allow users to delete their own comments" ON public.gamedev_lesson_comments
    FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------
-- File: supabase_gamedev_lessons.sql
-- ------------------------------------------
-- Create gamedev_lessons table
CREATE TABLE IF NOT EXISTS public.gamedev_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    level TEXT NOT NULL,
    img TEXT NOT NULL,
    video_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gamedev_lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to lessons" ON public.gamedev_lessons;
DROP POLICY IF EXISTS "Allow admins to modify lessons" ON public.gamedev_lessons;

-- Create policy for public read access
CREATE POLICY "Allow public read access to lessons" ON public.gamedev_lessons
    FOR SELECT USING (true);

-- Create policy for admin write access
CREATE POLICY "Allow admins to modify lessons" ON public.gamedev_lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- ------------------------------------------
-- File: supabase_gamedev_lessons_clear.sql
-- ------------------------------------------
-- Hamma darslarni o'chirib yuborish (Tozalash)
DELETE FROM public.gamedev_lessons;

-- ------------------------------------------
-- File: supabase_gamedev_lessons_insert.sql
-- ------------------------------------------
-- Insert new gamedev lessons
INSERT INTO public.gamedev_lessons (title, author, level, img, video_url) VALUES
('1-Dars: O''yin dizaynining asosiy tamoyillari', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson1.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('2-Dars: O''yinlardagi qiyinchilik', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson2.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('3-Dars: O''yinchini zeriktirmaslik siri - O''yin dizaynida ritm', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson3.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('4-Dars: O''yinlarda "syujet" qurish', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson4.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('5-Dars: Jang sahnalarini "nima" qiziqarli qiladi?', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson5.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('6-Dars: O''yiningizni qanday chiroyli qilish mumkin?', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson6.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8');

-- ------------------------------------------
-- File: supabase_gamedev_lessons_real_stats_patch.sql
-- ------------------------------------------
-- Add likes_count, views_count, duration, description to gamedev_lessons if not exists
ALTER TABLE public.gamedev_lessons ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 142;
ALTER TABLE public.gamedev_lessons ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 1520;
ALTER TABLE public.gamedev_lessons ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '15:20';
ALTER TABLE public.gamedev_lessons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Update null stats to defaults
UPDATE public.gamedev_lessons SET likes_count = 142 WHERE likes_count IS NULL;
UPDATE public.gamedev_lessons SET views_count = 1520 WHERE views_count IS NULL;

-- Update unique thumbnail images for GameDev 0dan o'rganish lessons
UPDATE public.gamedev_lessons SET img = '/gamedev_lesson1.png', likes_count = 142, views_count = 2100 WHERE title LIKE '1-Dars%';
UPDATE public.gamedev_lessons SET img = '/gamedev_lesson2.png', likes_count = 185, views_count = 2350 WHERE title LIKE '2-Dars%';
UPDATE public.gamedev_lessons SET img = '/gamedev_lesson3.png', likes_count = 156, views_count = 1980 WHERE title LIKE '3-Dars%';
UPDATE public.gamedev_lessons SET img = '/gamedev_lesson4.png', likes_count = 210, views_count = 2890 WHERE title LIKE '4-Dars%';
UPDATE public.gamedev_lessons SET img = '/gamedev_lesson5.png', likes_count = 198, views_count = 2420 WHERE title LIKE '5-Dars%';

-- Create gamedev_lesson_likes table for real user likes tracking
CREATE TABLE IF NOT EXISTS public.gamedev_lesson_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.gamedev_lessons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(lesson_id, user_id)
);

-- Enable RLS
ALTER TABLE public.gamedev_lesson_likes ENABLE ROW LEVEL SECURITY;

-- Policies for gamedev_lesson_likes
DROP POLICY IF EXISTS "Allow public read access to lesson likes" ON public.gamedev_lesson_likes;
DROP POLICY IF EXISTS "Allow authenticated users to insert likes" ON public.gamedev_lesson_likes;
DROP POLICY IF EXISTS "Allow authenticated users to delete their likes" ON public.gamedev_lesson_likes;

CREATE POLICY "Allow public read access to lesson likes" ON public.gamedev_lesson_likes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert likes" ON public.gamedev_lesson_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their likes" ON public.gamedev_lesson_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Allow public to update views_count and likes_count on gamedev_lessons
DROP POLICY IF EXISTS "Allow public update of lesson stats" ON public.gamedev_lessons;
CREATE POLICY "Allow public update of lesson stats" ON public.gamedev_lessons
    FOR UPDATE USING (true) WITH CHECK (true);

-- ------------------------------------------
-- File: supabase_global_notifications.sql
-- ------------------------------------------
-- Create a table for global site notifications (e.g. Streams going live)
CREATE TABLE IF NOT EXISTS global_notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Security) settings
ALTER TABLE global_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read global notifications
DROP POLICY IF EXISTS "Global notifications are viewable by everyone" ON global_notifications;
CREATE POLICY "Global notifications are viewable by everyone" ON global_notifications FOR SELECT USING (true);

-- Only authenticated users (or service role) can insert
DROP POLICY IF EXISTS "Authenticated users can insert global notifications" ON global_notifications;
CREATE POLICY "Authenticated users can insert global notifications" ON global_notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable Realtime for the table so users get instant alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'global_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE global_notifications;
  END IF;
END
$$;

-- ------------------------------------------
-- File: supabase_lessons_image_update.sql
-- ------------------------------------------
-- Update existing lessons image fields to local assets
UPDATE public.gamedev_lessons SET img = '/lesson1.png' WHERE title LIKE '1-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson2.png' WHERE title LIKE '2-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson3.png' WHERE title LIKE '3-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson4.png' WHERE title LIKE '4-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson5.png' WHERE title LIKE '5-Dars%';
UPDATE public.gamedev_lessons SET img = '/lesson6.png' WHERE title LIKE '6-Dars%';

-- ------------------------------------------
-- File: supabase_matematika_playlist.sql
-- ------------------------------------------
-- 1. Darsliklar jadvalini tozalash (chalkashliklarni to'liq bartaraf etish va noldan tartibli yozish uchun)
DELETE FROM public.gamedev_lessons;

-- 2. Barcha darsliklarni (6 ta original va 3 ta yangi matematika) boshidan toza holatda kiritish
INSERT INTO public.gamedev_lessons (title, author, level, img, video_url) VALUES
-- Original Game Design darslari
('1-Dars: O''yin dizaynining asosiy tamoyillari', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson1.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('2-Dars: O''yinlardagi qiyinchilik', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson2.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('3-Dars: O''yinchini zeriktirmaslik siri - O''yin dizaynida ritm', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson3.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('4-Dars: O''yinlarda "syujet" qurish', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson4.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('5-Dars: Jang sahnalarini "nima" qiziqarli qiladi?', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson5.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('6-Dars: O''yiningizni qanday chiroyli qilish mumkin?', 'Maroqli.uz', 'O''yin dizayni (boshlang''ich)', '/lesson6.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),

-- Yangi matematika darslari
('1-Dars: Vektorlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson1.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('2-Dars: Sinus to''lqinlari', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson2.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8'),
('3-Dars: Kuchlar', 'Maroqli.uz', 'O''yinlar matematika nazariyasi', '/math_lesson3.png', 'https://www.youtube.com/watch?v=gB1F9G0JHD8');

-- ------------------------------------------
-- File: supabase_news.sql
-- ------------------------------------------
-- Yangiliklar jadvali
CREATE TABLE news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Barchaga o'qish uchun ruxsat (Select)
CREATE POLICY "Public news are viewable by everyone." ON news FOR SELECT USING (true);

-- Faqat ADMIN rolli foydalanuvchilar yoza oladi (Insert, Update, Delete)
CREATE POLICY "Only admins can insert news" ON news FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);
CREATE POLICY "Only admins can update news" ON news FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);
CREATE POLICY "Only admins can delete news" ON news FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- Storage bucket yaratish (Fayl yuklash uchun)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news', 'news', true)
ON CONFLICT (id) DO NOTHING;

-- Storage uchun RLS qoidalari
CREATE POLICY "Public Access for News Images" ON storage.objects FOR SELECT USING (bucket_id = 'news');

CREATE POLICY "Admin Upload Access for News Images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'news' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- ------------------------------------------
-- File: supabase_news_image_update.sql
-- ------------------------------------------
-- Update existing news articles to point to the new custom generated images
UPDATE public.news 
SET image_url = '/news1.png' 
WHERE id = '436087c6-8a3a-422b-b1ae-3206ba92fec5';

UPDATE public.news 
SET image_url = '/news2.png' 
WHERE id = '1e2321de-05a3-4d3c-bd09-29da871ea32d';

-- ------------------------------------------
-- File: supabase_patch_premium.sql
-- ------------------------------------------
-- Supabase profiles jadvaliga premium ma'lumotlarini qo'shish
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Mavjud ma'lumotlarni xavfsiz holatga keltirish
UPDATE profiles 
SET is_premium = FALSE 
WHERE is_premium IS NULL;

-- ------------------------------------------
-- File: supabase_payment_requests.sql
-- ------------------------------------------
-- To'lov arizalari (P2P + Chek) uchun jadval
CREATE TABLE payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- 'GAME' yoki 'PREMIUM'
  item_id UUID, -- O'yin UUID (developed_games.id)
  amount NUMERIC NOT NULL,
  receipt_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- PENDING, APPROVED, REJECTED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) faollashtirish
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- 1. Foydalanuvchilar o'z arizalarini ko'rishlari
CREATE POLICY "Users can view their own payment requests."
  ON payment_requests FOR SELECT
  USING ( auth.uid() = user_id );

-- 2. Ro'yxatdan o'tganlar ariza topshirishlari
CREATE POLICY "Authenticated users can submit payment requests."
  ON payment_requests FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

-- 3. Admin barcha arizalarni ko'ra olishi
CREATE POLICY "Admins can view all payment requests."
  ON payment_requests FOR SELECT
  USING ( 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- 4. Admin arizalarni tahrirlay olishi
CREATE POLICY "Admins can update payment requests."
  ON payment_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- ------------------------------------------
-- File: supabase_profiles.sql
-- ------------------------------------------
-- Ushbu kodni Supabase proyektidagi SQL Editor bo'limiga kiritib "Run" (ishga tushirish) ni bosing:

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  age INTEGER,
  region TEXT,
  phone_number TEXT,
  role TEXT DEFAULT 'GAMER',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari (xavfsizlik uchun)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- ------------------------------------------
-- File: supabase_profiles_last_seen.sql
-- ------------------------------------------
-- Add last_seen column to track active sessions and online users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- ------------------------------------------
-- File: supabase_stk_game.sql
-- ------------------------------------------
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

-- ------------------------------------------
-- File: supabase_storage_setup.sql
-- ------------------------------------------
-- Storage buckets yaratish
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('game_files', 'game_files', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars storage policies
CREATE POLICY "Public Access for Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated Upload Access for Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Access for Avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Access for Avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Receipts storage policies
CREATE POLICY "Public Access for Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Authenticated Upload Access for Receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Game files storage policies
CREATE POLICY "Public Access for Game Files" ON storage.objects FOR SELECT USING (bucket_id = 'game_files');
CREATE POLICY "Authenticated Upload Access for Game Files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game_files' AND auth.role() = 'authenticated');

-- ------------------------------------------
-- File: supabase_streamers.sql
-- ------------------------------------------
-- Strimerlar uchun jadval
CREATE TABLE streamers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stream_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Twitch',
  game TEXT,
  title TEXT,
  is_live BOOLEAN DEFAULT false,
  viewers_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Strimerlarni kuzatuvchilar jadvali
CREATE TABLE streamer_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(streamer_id, follower_id)
);

-- RLS Qoidalari
ALTER TABLE streamers ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamer_followers ENABLE ROW LEVEL SECURITY;

-- 1. Hamma strimerlarni ko'ra oladi
CREATE POLICY "Public streamers are viewable by everyone."
  ON streamers FOR SELECT USING ( true );

-- 2. Faqat ro'yxatdan o'tganlar strimer profilini yaratishi mumkin
CREATE POLICY "Authenticated users can insert streamers."
  ON streamers FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

-- 3. Faqat strimerni o'zi yoki Admin o'zgartirishi mumkin
CREATE POLICY "Users can update their own streamer profile."
  ON streamers FOR UPDATE
  USING ( auth.uid() = user_id );

-- 4. Hamma followerlarni ko'ra oladi
CREATE POLICY "Public followers are viewable by everyone."
  ON streamer_followers FOR SELECT USING ( true );

-- 5. Foydalanuvchilar follow qila oladi
CREATE POLICY "Authenticated users can follow."
  ON streamer_followers FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = follower_id );

-- 6. Foydalanuvchilar unfollow qila oladi
CREATE POLICY "Users can unfollow."
  ON streamer_followers FOR DELETE
  USING ( auth.uid() = follower_id );

-- Funksiya: Kuzatuvchilar sonini avtomatik hisoblash
CREATE OR REPLACE FUNCTION update_streamer_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE streamers SET followers_count = followers_count + 1 WHERE id = NEW.streamer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE streamers SET followers_count = followers_count - 1 WHERE id = OLD.streamer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_followers_count
AFTER INSERT OR DELETE ON streamer_followers
FOR EACH ROW EXECUTE FUNCTION update_streamer_followers_count();

-- ------------------------------------------
-- File: supabase_streams.sql
-- ------------------------------------------
-- Jonli Efir (Live Streams) uchun Jadvallar

-- 1. live_streams jadvali
CREATE TABLE IF NOT EXISTS public.live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Yangi jonli efir',
    game_name TEXT,
    stream_key TEXT UNIQUE NOT NULL,
    stream_url TEXT,
    is_live BOOLEAN DEFAULT false,
    viewers_count INTEGER DEFAULT 0,
    donation_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS siyosatlari
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Hamma o'qiy oladi
CREATE POLICY "Streams are viewable by everyone" ON public.live_streams
    FOR SELECT USING (true);

-- Faqat o'zi tahrirlay oladi
CREATE POLICY "Users can insert their own streams" ON public.live_streams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streams" ON public.live_streams
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streams" ON public.live_streams
    FOR DELETE USING (auth.uid() = user_id);

-- 2. stream_chat jadvali
CREATE TABLE IF NOT EXISTS public.stream_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS siyosatlari
ALTER TABLE public.stream_chat ENABLE ROW LEVEL SECURITY;

-- Hamma o'qiy oladi
CREATE POLICY "Chat is viewable by everyone" ON public.stream_chat
    FOR SELECT USING (true);

-- Avtorizatsiyadan o'tganlar yoza oladi
CREATE POLICY "Authenticated users can insert chat" ON public.stream_chat
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to handle timestamp update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_streams_modtime
    BEFORE UPDATE ON public.live_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------
-- File: supabase_streams_rls_patch.sql
-- ------------------------------------------
-- 1. Hozirgi qolib ketgan turnir efirlarini to'xtatish (is_live = false)
UPDATE public.live_streams SET is_live = false WHERE game_name = 'TURNIR';

-- 2. RLS yangilash va o'chirish siyosatlarini adminlar uchun ham yo'lga qo'yish
DROP POLICY IF EXISTS "Users can update their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON public.live_streams;

-- Foydalanuvchilar o'z efirini, adminlar esa xohlagan efirni tahrirlay oladi
CREATE POLICY "Users and admins can update streams" ON public.live_streams
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- Foydalanuvchilar o'z efirini, adminlar esa xohlagan efirni o'chira oladi
CREATE POLICY "Users and admins can delete streams" ON public.live_streams
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- ------------------------------------------
-- File: supabase_tournaments.sql
-- ------------------------------------------
-- Jamoalar jadvali
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  captain_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jamoa a'zolari jadvali
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  in_game_id TEXT NOT NULL,
  role TEXT DEFAULT 'PLAYER', -- CAPTAIN, PLAYER
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Turnirlar jadvali
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  game TEXT NOT NULL, -- e.g., CS2, Dota 2, PUBG
  format TEXT NOT NULL, -- e.g., 5v5, 1v1
  prize_pool TEXT NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 16,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'UPCOMING', -- UPCOMING, ONGOING, COMPLETED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turnir ishtirokchilari (jamoalar)
CREATE TABLE tournament_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tournament_id, team_id)
);

-- Turnir o'yinlari (Matchlar)
CREATE TABLE tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL, -- 1 = Final, 2 = Semi, 3 = Quarter, etc. (Or 1/16, 1/8)
  match_order INTEGER NOT NULL, -- Position in the bracket
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  screenshot_url TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, COMPLETED, DISPUTED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Barchaga ruxsat (Select)
CREATE POLICY "Public teams are viewable by everyone." ON teams FOR SELECT USING (true);
CREATE POLICY "Public members viewable." ON team_members FOR SELECT USING (true);
CREATE POLICY "Public tournaments viewable." ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public participants viewable." ON tournament_participants FOR SELECT USING (true);
CREATE POLICY "Public matches viewable." ON tournament_matches FOR SELECT USING (true);

-- Insert/Update qoidalari (Jamoalar uchun faqat avtorizatsiyadan o'tganlar, sardorlar)
CREATE POLICY "Auth users can create teams." ON teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Captains can update teams." ON teams FOR UPDATE USING (auth.uid() = captain_id);

CREATE POLICY "Auth users can join teams." ON team_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can leave teams." ON team_members FOR DELETE USING (auth.uid() = user_id);

-- Turnir ma'lumotlarini o'zgartirish (faqat adminlar uchun, yoki hozircha hamma authentikatsiya bo'lganlarga, keyin tuzatamiz)
-- Hozircha oddiy ro'yxatdan o'tish siyosati: Jamoa sardori ro'yxatdan o'tkaza oladi.
CREATE POLICY "Authenticated can register for tournaments." ON tournament_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Natija yuklash (Matchlar)
CREATE POLICY "Authenticated users can update match results." ON tournament_matches FOR UPDATE USING (auth.role() = 'authenticated');

-- ------------------------------------------
-- File: supabase_tournaments_patch.sql
-- ------------------------------------------
-- Supabase tournaments jadvaliga premium turnir sozlamasini qo'shish
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Mavjud turnirlarni xavfsiz holda premium: false qilish
UPDATE tournaments 
SET is_premium = FALSE 
WHERE is_premium IS NULL;

-- ------------------------------------------
-- File: supabase_tournaments_rls_patch.sql
-- ------------------------------------------
-- Fix column 'format' constraint by setting a default value '5v5' so it doesn't fail NOT NULL constraint during creation
ALTER TABLE tournaments ALTER COLUMN format SET DEFAULT '5v5';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;

-- Add RLS policies for Admins to create and manage tournaments
CREATE POLICY "Admins can insert tournaments" ON public.tournaments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can update tournaments" ON public.tournaments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can delete tournaments" ON public.tournaments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- ------------------------------------------
-- File: supabase_update_news.sql
-- ------------------------------------------
-- Yangiliklar sarlavhasi va tarkibidagi eski nomni yangilash
UPDATE news
SET 
  title = REPLACE(title, 'PlayNationUz', 'Maroqli.uz'),
  content = REPLACE(content, 'PlayNationUz', 'Maroqli.uz')
WHERE id = '1e2321de-05a3-4d3c-bd09-29da871ea32d';

-- ------------------------------------------
-- File: supabase_updates.sql
-- ------------------------------------------
-- O'yin yaratuvchilar studiyasi uchun profil jadvali
CREATE TABLE IF NOT EXISTS gamedev_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  studio_name TEXT NOT NULL,
  team_members TEXT, -- Jamoa a'zolari (vergul bilan ajratilgan yoki matn)
  location TEXT, -- Studio manzili/joylashuvi
  demo_url TEXT, -- O'yin demoning rasm yoki video havolasi
  demo_type TEXT DEFAULT 'image', -- 'image' yoki 'video'
  release_date TEXT, -- O'yinning to'liq reliz sanasi
  donation_url TEXT, -- Donat qilish uchun havola (Click/Payme yoki boshqa)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE gamedev_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Hamma studiya profillarini ko'ra oladi
CREATE POLICY "Public gamedev profiles are viewable by everyone."
  ON gamedev_profiles FOR SELECT
  USING ( true );

-- 2. Faqat gamedev foydalanuvchilar o'z profilini yarata oladi
CREATE POLICY "GameDevs can insert their own profile."
  ON gamedev_profiles FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- 3. Faqat gamedev foydalanuvchilar o'z profilini tahrirlay oladi
CREATE POLICY "GameDevs can update their own profile."
  ON gamedev_profiles FOR UPDATE
  USING ( auth.uid() = user_id );


-- Strimerlarga yuborilgan donatlar jadvali
CREATE TABLE IF NOT EXISTS streamer_donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE NOT NULL,
  donor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE streamer_donations ENABLE ROW LEVEL SECURITY;

-- 1. Hamma donatlarni ko'ra oladi
CREATE POLICY "Public streamer donations are viewable by everyone."
  ON streamer_donations FOR SELECT
  USING ( true );

-- 2. Tizimda ro'yxatdan o'tgan yoki mehmonlar donat qila oladi
CREATE POLICY "Anyone can insert donations."
  ON streamer_donations FOR INSERT
  WITH CHECK ( true );

-- GameDev avvalgi loyihalari uchun jadval
CREATE TABLE IF NOT EXISTS gamedev_past_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  platform TEXT DEFAULT 'PC', -- 'PC', 'Mobile', 'Har ikkisi'
  release_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE gamedev_past_projects ENABLE ROW LEVEL SECURITY;

-- 1. Hamma avvalgi loyihalarni ko'ra oladi
CREATE POLICY "Public past projects are viewable by everyone."
  ON gamedev_past_projects FOR SELECT
  USING ( true );

-- 2. Faqat gamedev foydalanuvchilar o'z avvalgi loyihalarini yarata oladi
CREATE POLICY "GameDevs can insert their own past projects."
  ON gamedev_past_projects FOR INSERT
  WITH CHECK ( auth.uid() = developer_id );

-- 3. Faqat gamedev foydalanuvchilar o'z avvalgi loyihalarini tahrirlay oladi
CREATE POLICY "GameDevs can update their own past projects."
  ON gamedev_past_projects FOR UPDATE
  USING ( auth.uid() = developer_id );

-- 4. Faqat gamedev foydalanuvchilar o'z avvalgi loyihalarini o'chira oladi
CREATE POLICY "GameDevs can delete their own past projects."
  ON gamedev_past_projects FOR DELETE
  USING ( auth.uid() = developer_id );


-- Adminga murojaat qilish uchun jadval (Support requests)
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalarini faollashtirish
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- 1. Istalgan odam murojaat yoza oladi
CREATE POLICY "Anyone can insert support requests."
  ON support_requests FOR INSERT
  WITH CHECK ( true );

-- 2. Faqat adminlar barcha murojaatlarni ko'ra oladi
CREATE POLICY "Only admins can view support requests."
  ON support_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- ------------------------------------------
-- File: supabase_xonotic_game.sql
-- ------------------------------------------
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
        INSERT INTO public.developed_games (developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, download_url, cover, executable_path)
        VALUES (
            dev_id,
            'Xonotic 0.8.6',
            'xonotic-0-8-6',
            0,
            0,
            'PC',
            'Shafqatsiz arenalarga xush kelibsiz! Xonotic - bu ochiq kodli, yuqori tezlikdagi birinchi shaxsdan otiladigan (FPS) shooter o''yini. U ajoyib tezlik, turli xil qurollar va turli xil arenalar bilan jihozlangan.

O''yinda Deathmatch, Capture the Flag, Clan Arena va boshqa ko''plab qiziqarli rejimlar mavjud. Xonotic o''yin dunyosining eng mashhur va shiddatli ochiq kodli FPS o''yinlaridan biri hisoblanadi. Uni Maroqli.uz platformasidan mutlaqo bepul yuklab olishingiz mumkin.',
            'Ingliz, Rus',
            'OS: Windows 10/11, RAM: 4GB, GPU: Intel HD Graphics / AMD Radeon',
            '/xonotic-0.8.6.zip',
            '/xonotic_cover.png',
            'xonotic.exe'
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

-- ------------------------------------------
-- File: supabase_game_scores_and_daily_rewards.sql
-- ------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_slug TEXT NOT NULL,
    score BIGINT NOT NULL DEFAULT 0,
    play_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_slug_score ON public.game_scores(game_slug, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON public.game_scores(user_id);

CREATE TABLE IF NOT EXISTS public.user_daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    coins_earned INTEGER NOT NULL DEFAULT 50,
    streak_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_daily_reward UNIQUE (user_id, reward_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_rewards_user_date ON public.user_daily_rewards(user_id, reward_date);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to game_scores" ON public.game_scores;
CREATE POLICY "Allow public read access to game_scores" ON public.game_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated user insert game_scores" ON public.game_scores;
CREATE POLICY "Allow authenticated user insert game_scores" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow user read own daily_rewards" ON public.user_daily_rewards;
CREATE POLICY "Allow user read own daily_rewards" ON public.user_daily_rewards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow user insert own daily_rewards" ON public.user_daily_rewards;
CREATE POLICY "Allow user insert own daily_rewards" ON public.user_daily_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);


