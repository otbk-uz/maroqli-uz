# MAROQLI.uz — Gaming Ekotizim Platformasi

O'zbekiston va Markaziy Osiyoda gaming hamjamiyatini birlashtiruvchi ekotizim platformasi.

## Loyiha Strukturasi

- `/` — Frontend (Next.js 14)
- `/backend` — Backend (Django REST Framework)

## Ishga tushirish (Frontend)

1. `npm install`
2. `npm run dev`

## Ishga tushirish (Backend)

1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` (Windows: `venv\Scripts\activate`)
4. `pip install -r requirements.txt`
5. `python manage.py migrate`
6. `python manage.py runserver`

## Texnologiyalar

- **Frontend:** Next.js, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Django, PostgreSQL, Redis, Celery, JWT.