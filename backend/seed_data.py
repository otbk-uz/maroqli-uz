import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.community.models import News, ForumSection
from apps.users.models import User

# Ensure admin user
admin_user, _ = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@playnation.uz',
        'full_name': 'Tizim Admini',
        'age': 25,
        'region': 'TOSHKENT_S',
        'phone_number': '+998991112233',
        'is_staff': True,
        'is_superuser': True,
        'role': 'ADMIN'
    }
)
if not admin_user.is_superuser or admin_user.role != 'ADMIN':
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.role = 'ADMIN'
    admin_user.set_password('Admin123!')
    admin_user.save()


# Seed News
news_data = [
    {
        "title": "O'zbekistonda yangi esport federatsiyasi tashkil etildi",
        "content": "O'zbekistonda kiber-sportni rivojlantirish maqsadida yangi esport federatsiyasi tashkil etildi. Ushbu federatsiya mahalliy turnirlarni tartibga solish va xalqaro miqyosdagi o'yinlarni qo'llab-quvvatlashga mas'ul bo'ladi.",
        "category": "ESPORT"
    },
    {
        "title": "CS2 uchun katta yangilanish: yangi xarita va skinlar",
        "content": "Valve kompaniyasi Counter-Strike 2 o'yini uchun yirik yangilanishni chiqardi. Unda yangi xaritalar qo'shildi va kutilgan qurol dizaynlari yangilandi. Yangilanish bilan birga chiroyli skin kolleksiyalari va maxsus o'yin qoidalari ham taqdim etildi.",
        "category": "GAMES"
    },
    {
        "title": "PlayNationUz turnirlarida rekord darajadagi ishtirok",
        "content": "PlayNationUz platformasida o'tkazilgan oxirgi turnirda rekord miqdorda gamerlar ro'yxatdan o'tdi. Bu turnir O'zbekiston kiber-olamida katta shov-shuvga sabab bo'ldi. 500 dan ortiq ishtirokchilar qatnashdi.",
        "category": "PLATFORM"
    }
]

for item in news_data:
    News.objects.get_or_create(
        title=item["title"],
        defaults={
            "content": item["content"],
            "category": item["category"],
            "author": admin_user
        }
    )

# Seed Forum Sections
sections = [
    ("Umumiy", "Umumiy suhbatlar va muhokamalar"),
    ("O'yinlar", "Kiber o'yinlar va yangiliklar"),
    ("Turnirlar", "Turnirlar haqida barcha ma'lumotlar"),
    ("GameDev", "O'yin yaratish va dasturlash"),
    ("Yordam", "Platforma bo'yicha savol-javoblar")
]

for name, desc in sections:
    ForumSection.objects.get_or_create(name=name, defaults={"description": desc})

# Seed Games and Tournaments
from apps.tournaments.models import Game, Tournament
from django.utils import timezone
from datetime import timedelta

games_data = [
    {"name": "Counter-Strike 2", "slug": "cs2"},
    {"name": "Dota 2", "slug": "dota2"},
    {"name": "Valorant", "slug": "valorant"},
    {"name": "PUBG Mobile", "slug": "pubgm"},
    {"name": "FC 24", "slug": "fc24"}
]

games_dict = {}
for g in games_data:
    game_obj, _ = Game.objects.get_or_create(name=g["name"], defaults={"slug": g["slug"]})
    games_dict[g["slug"]] = game_obj

tournaments_data = [
    {
        "title": "Counter-Strike 2: Uz Cup #12",
        "description": "O'zbekistonning eng kuchli jamoalari o'rtasidagi CS2 turniri.",
        "game_slug": "cs2",
        "status": "LIVE",
        "prize_pool": 500.00,
        "max_participants": 64,
        "start_offset": -1
    },
    {
        "title": "Dota 2: Central Asia League",
        "description": "Markaziy Osiyo Dota 2 ligasi. Mukofot jamg'armasi $1,200.",
        "game_slug": "dota2",
        "status": "UPCOMING",
        "prize_pool": 1200.00,
        "max_participants": 16,
        "start_offset": 5
    },
    {
        "title": "Valorant: Night Warriors",
        "description": "Valorant havaskorlar va professionallar turniri.",
        "game_slug": "valorant",
        "status": "UPCOMING",
        "prize_pool": 300.00,
        "max_participants": 32,
        "start_offset": 10
    },
    {
        "title": "PUBG Mobile: Toshkent Open",
        "description": "PUBG Mobile Toshkent chempionati.",
        "game_slug": "pubgm",
        "status": "UPCOMING",
        "prize_pool": 1000.00,
        "max_participants": 100,
        "start_offset": 15
    },
    {
        "title": "FC 24: Uzbekistan Championship",
        "description": "FIFA 24 (FC 24) bo'yicha O'zbekiston chempionati.",
        "game_slug": "fc24",
        "status": "UPCOMING",
        "prize_pool": 2000.00,
        "max_participants": 128,
        "start_offset": 20
    }
]

for t in tournaments_data:
    start_time = timezone.now() + timedelta(days=t["start_offset"])
    Tournament.objects.get_or_create(
        title=t["title"],
        defaults={
            "description": t["description"],
            "game": games_dict[t["game_slug"]],
            "status": t["status"],
            "prize_pool": t["prize_pool"],
            "max_participants": t["max_participants"],
            "start_date": start_time,
            "end_date": start_time + timedelta(days=2)
        }
    )

from apps.tournaments.models import StoreGame
store_games_data = [
    {
        "title": "Shadow of Tashkent",
        "slug": "shadow-tashkent",
        "description": "Toshkent ko'chalarida kechadigan qiziqarli indie RPG sarguzasht o'yini. Mahalliy madaniyat va kiber-punk elementlar bilan boyitilgan.",
        "price": 29000.00,
        "platform": "PC",
        "language": "O'zbek, Rus, Ingliz",
        "sys_requirements": "OS: Windows 10, CPU: Intel i5, RAM: 8GB, GPU: GTX 1050"
    },
    {
        "title": "Desert Riders: Bukhara",
        "slug": "desert-riders-bukhara",
        "description": "Buxoro cho'llarida kechadigan poyga o'yini. Mobil qurilmalar uchun ajoyib boshqaruv va 3D grafika.",
        "price": 15000.00,
        "platform": "MOBILE",
        "language": "O'zbek, Rus",
        "sys_requirements": "OS: Android 8.0 / iOS 12, RAM: 4GB"
    },
    {
        "title": "Samarkand Conquest",
        "slug": "samarkand-conquest",
        "description": "Tarixiy strategiya janridagi o'yin. Amir Temur davridagi janglar va shaharsozlikni boshqaring.",
        "price": 49000.00,
        "platform": "PC",
        "language": "O'zbek, Rus, Ingliz, Turk",
        "sys_requirements": "OS: Windows 10/11, CPU: Intel i7, RAM: 16GB, GPU: GTX 1660"
    }
]

for sg in store_games_data:
    StoreGame.objects.get_or_create(
        slug=sg["slug"],
        defaults={
            "title": sg["title"],
            "description": sg["description"],
            "price": sg["price"],
            "platform": sg["platform"],
            "language": sg["language"],
            "sys_requirements": sg["sys_requirements"],
            "developer": admin_user
        }
    )

from apps.users.models import Notification
Notification.objects.get_or_create(
    user=admin_user,
    title="🏆 Turnir Ro'yxati Tasdiqlandi",
    defaults={
        "message": "Counter-Strike 2: Uz Cup #12 turniri ro'yxatdan o'tish bosqichi yakunlandi. Tez orada janglar boshlanadi!",
        "is_read": False
    }
)
Notification.objects.get_or_create(
    user=admin_user,
    title="💰 Do'konda Yangi O'yin",
    defaults={
        "message": "Shadow of Tashkent o'yini do'konga qo'shildi. CD-keylarni sotib olishingiz mumkin.",
        "is_read": False
    }
)
Notification.objects.get_or_create(
    user=admin_user,
    title="👑 Premium Chegirma",
    defaults={
        "message": "Premium a'zolarimiz uchun barcha do'kondagi o'yinlarga 20% chegirma taqdim etiladi.",
        "is_read": True
    }
)

print("Database seeded successfully with all initial records!")
