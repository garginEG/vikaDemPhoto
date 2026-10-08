-- ============================================
-- Victoria Photography — Supabase setup
-- Запусти этот SQL в Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Таблица портфолио
create table if not exists public.portfolio (
    id uuid primary key default gen_random_uuid(),
    src text not null,
    label text default '',
    "order" integer default 0,
    created_at timestamptz default now()
);

-- 2. Таблица цен / тарифов
create table if not exists public.pricing (
    id text primary key,
    name text not null,
    subtitle text default '',
    price text not null,
    currency text default '₽',
    duration text default '',
    features jsonb default '[]'::jsonb,
    featured boolean default false,
    cta_text text default 'Забронировать',
    "order" integer default 0,
    updated_at timestamptz default now()
);

-- 3. Дефолтные тарифы
insert into public.pricing (id, name, subtitle, price, currency, duration, features, featured, cta_text, "order") values
('soft', 'Soft', 'Лёгкая съёмка, один образ', '15 000', '₽', '1 час · 1 локация',
 '["1 образ", "15 обработанных фото", "Все исходники в облаке", "Готовность за 5 дней"]'::jsonb,
 false, 'Забронировать', 1),
('studio', 'Studio', 'Базовый формат — чаще всего выбирают', '30 000', '₽', '2,5 часа · до 3 образов',
 '["До 3 образов", "35 обработанных фото", "Помощь с позированием", "Подбор студии и света", "Готовность за 7 дней"]'::jsonb,
 true, 'Забронировать', 2),
('editorial', 'Editorial', 'Для брендов и lookbook''ов', 'от 60 000', '₽', 'полный день · команда',
 '["Без ограничения образов", "60+ обработанных фото", "Помощь с подбором стилиста и MUAH", "Бэкстейдж по запросу", "Готовность за 10 дней"]'::jsonb,
 false, 'Обсудить', 3)
on conflict (id) do nothing;

-- 4. Row-Level Security
alter table public.portfolio enable row level security;
alter table public.pricing enable row level security;

-- Читать может кто угодно (анонимные посетители сайта)
create policy "Public read portfolio"
    on public.portfolio for select
    using (true);

create policy "Public read pricing"
    on public.pricing for select
    using (true);

-- Писать/удалять/обновлять — только залогиненные (Виктория)
create policy "Auth write portfolio"
    on public.portfolio for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

create policy "Auth write pricing"
    on public.pricing for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- 5. Storage bucket для фото
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Public read portfolio bucket"
    on storage.objects for select
    using (bucket_id = 'portfolio');

create policy "Auth upload to portfolio bucket"
    on storage.objects for insert
    with check (bucket_id = 'portfolio' and auth.role() = 'authenticated');

create policy "Auth delete from portfolio bucket"
    on storage.objects for delete
    using (bucket_id = 'portfolio' and auth.role() = 'authenticated');

-- ============================================
-- ДАЛЬШЕ:
-- 1. Authentication → Users → Add user → Create new user
--    Email: victoria@example.com   Password: придумай надёжный
--    Поставь галочку "Auto Confirm User"
-- 2. Settings → API → скопируй "Project URL" и "anon public" ключ
-- 3. Вставь их в js/supabase-client.js
-- ============================================
