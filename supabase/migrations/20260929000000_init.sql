-- Schema iniziale: catalogo prezzi + ordini + bucket foto per cialde

-- ---------- Catalogo ----------
create table if not exists public.catalog_items (
  key         text primary key,            -- es. "filling:pistacchio"
  category    text not null,
  label       text not null,
  price       numeric(8,2) not null default 0 check (price >= 0),
  active      boolean not null default true,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------- Ordini ----------
create sequence if not exists public.order_code_seq start 1001;

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique default ('T' || nextval('public.order_code_seq')::text),
  created_at      timestamptz not null default now(),
  status          text not null default 'nuovo'
                  check (status in ('nuovo', 'confermato', 'in_lavorazione', 'pronto', 'ritirato', 'annullato')),
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  pickup_date     date not null,
  pickup_slot     text not null,
  config          jsonb not null,
  summary         text not null,
  notes           text,
  image_path      text,
  price_lines     jsonb not null,
  total_price     numeric(8,2) not null
);

create index if not exists orders_pickup_date_idx on public.orders (pickup_date);
create index if not exists orders_status_idx on public.orders (status);

-- RLS attiva e nessuna policy pubblica: legge/scrive solo il server (service role).
-- Quando aggiungerai il pannello della pasticceria, qui andranno le policy per gli utenti staff.
alter table public.catalog_items enable row level security;
alter table public.orders enable row level security;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-images', 'order-images', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
