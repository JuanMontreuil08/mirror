-- ============================================================
-- Migración inicial — Stock Tracker MVP
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- FUNCIÓN: auto-update de updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- 1. USERS
-- Extiende auth.users con datos de perfil
-- ============================================================
create table public.users (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text,
  timezone      text default 'America/Lima',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create trigger set_updated_at_users
  before update on public.users
  for each row execute function update_updated_at();


-- ============================================================
-- 2. PORTFOLIOS
-- Un portafolio por usuario en MVP
-- ============================================================
create table public.portfolios (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  name          text default 'Mi portafolio',
  currency      text default 'USD',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.portfolios enable row level security;

create policy "Users can view own portfolios"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolios"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolios"
  on public.portfolios for update
  using (auth.uid() = user_id);

create policy "Users can delete own portfolios"
  on public.portfolios for delete
  using (auth.uid() = user_id);

create trigger set_updated_at_portfolios
  before update on public.portfolios
  for each row execute function update_updated_at();


-- ============================================================
-- 3. POSITIONS
-- Una fila por activo en el portafolio
-- ============================================================
create table public.positions (
  id                uuid default gen_random_uuid() primary key,
  portfolio_id      uuid references public.portfolios(id) on delete cascade not null,
  user_id           uuid references public.users(id) on delete cascade not null,

  ticker            text not null,
  company_name      text,
  asset_type        text default 'stock' check (asset_type in ('stock', 'etf')),
  market            text default 'US' check (market in ('US')),

  quantity          numeric(18, 6) not null,
  avg_buy_price     numeric(18, 4) not null,
  total_invested    numeric(18, 4) not null,

  is_active         boolean default true,

  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),

  unique(portfolio_id, ticker)
);

alter table public.positions enable row level security;

create policy "Users can view own positions"
  on public.positions for select
  using (auth.uid() = user_id);

create policy "Users can insert own positions"
  on public.positions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own positions"
  on public.positions for update
  using (auth.uid() = user_id);

create policy "Users can delete own positions"
  on public.positions for delete
  using (auth.uid() = user_id);

create trigger set_updated_at_positions
  before update on public.positions
  for each row execute function update_updated_at();

create index idx_positions_portfolio_id on public.positions(portfolio_id);
create index idx_positions_user_id on public.positions(user_id);
create index idx_positions_ticker on public.positions(ticker);


-- ============================================================
-- 4. TRANSACTIONS
-- Fuente de verdad. Permite recalcular avg_buy_price.
-- ============================================================
create table public.transactions (
  id              uuid default gen_random_uuid() primary key,
  portfolio_id    uuid references public.portfolios(id) on delete cascade not null,
  user_id         uuid references public.users(id) on delete cascade not null,
  position_id     uuid references public.positions(id) on delete set null,

  ticker          text not null,
  transaction_type text not null check (transaction_type in ('buy', 'sell')),
  quantity        numeric(18, 6) not null,
  price_per_share numeric(18, 4) not null,
  total_amount    numeric(18, 4) not null,
  transaction_date date not null,
  notes           text,

  source          text default 'manual' check (source in ('manual', 'voucher', 'excel')),
  source_file_url text,

  created_at      timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

create index idx_transactions_portfolio_id on public.transactions(portfolio_id);
create index idx_transactions_ticker on public.transactions(ticker);


-- ============================================================
-- 5. PRICE_CACHE
-- Global — sin FK a usuarios. RLS desactivado (lectura pública).
-- Se actualiza cada 15 min durante market hours via cron.
-- ============================================================
create table public.price_cache (
  ticker          text primary key,
  current_price   numeric(18, 4) not null,
  price_change    numeric(18, 4),
  price_change_pct numeric(8, 4),
  previous_close  numeric(18, 4),
  market_status   text default 'closed' check (market_status in ('open', 'closed', 'pre', 'post')),
  fetched_at      timestamptz default now(),
  source          text default 'alpaca' check (source in ('alpaca', 'finnhub'))
);

-- Sin RLS: todos los usuarios necesitan los mismos precios
create index idx_price_cache_fetched_at on public.price_cache(fetched_at);


-- ============================================================
-- 6. DAILY_SUMMARIES
-- Resumen diario generado por Claude a las 6pm ET
-- ============================================================
create table public.daily_summaries (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,
  portfolio_id    uuid references public.portfolios(id) on delete cascade not null,

  summary_date    date not null,

  total_value_usd numeric(18, 4),
  total_change_usd numeric(18, 4),
  total_change_pct numeric(8, 4),

  summary_text    text not null,
  top_movers      jsonb,
  what_to_do      jsonb,

  was_sent        boolean default false,
  sent_at         timestamptz,

  created_at      timestamptz default now(),

  unique(user_id, summary_date)
);

alter table public.daily_summaries enable row level security;

create policy "Users can view own summaries"
  on public.daily_summaries for select
  using (auth.uid() = user_id);

create policy "Users can insert own summaries"
  on public.daily_summaries for insert
  with check (auth.uid() = user_id);

create index idx_daily_summaries_user_date on public.daily_summaries(user_id, summary_date desc);


-- ============================================================
-- 7. ALERTS
-- Alertas por movimientos de precio o noticias
-- ============================================================
create table public.alerts (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,
  portfolio_id    uuid references public.portfolios(id) on delete cascade not null,

  ticker          text not null,
  alert_type      text not null check (alert_type in ('price_move', 'news', 'earnings')),
  trigger_value   numeric(8, 4),

  title           text not null,
  body            text not null,

  is_read         boolean default false,
  was_sent        boolean default false,
  sent_at         timestamptz,

  created_at      timestamptz default now()
);

alter table public.alerts enable row level security;

create policy "Users can view own alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "Users can insert own alerts"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own alerts"
  on public.alerts for update
  using (auth.uid() = user_id);

create index idx_alerts_user_unread on public.alerts(user_id, is_read, created_at desc);


-- ============================================================
-- 8. NOTIFICATION_PREFERENCES
-- Preferencias de notificación por usuario
-- ============================================================
create table public.notification_preferences (
  user_id               uuid references public.users(id) on delete cascade primary key,

  daily_summary_enabled boolean default true,
  daily_summary_time    time default '08:00:00',

  price_alert_enabled   boolean default true,
  price_alert_threshold numeric(5, 2) default 5.0,

  news_alert_enabled    boolean default true,

  email_enabled         boolean default true,

  updated_at            timestamptz default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = user_id);


-- ============================================================
-- 9. FILE_IMPORTS
-- Trazabilidad de vouchers y Excel subidos
-- ============================================================
create table public.file_imports (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,

  file_name       text not null,
  file_type       text not null check (file_type in ('voucher_image', 'voucher_pdf', 'excel')),
  file_url        text not null,

  status          text default 'pending' check (status in ('pending', 'success', 'partial', 'failed')),
  extracted_data  jsonb,
  error_message   text,
  transactions_created int default 0,

  created_at      timestamptz default now(),
  processed_at    timestamptz
);

alter table public.file_imports enable row level security;

create policy "Users can view own file imports"
  on public.file_imports for select
  using (auth.uid() = user_id);

create policy "Users can insert own file imports"
  on public.file_imports for insert
  with check (auth.uid() = user_id);

create policy "Users can update own file imports"
  on public.file_imports for update
  using (auth.uid() = user_id);


-- ============================================================
-- TRIGGER: crear portafolio y preferencias al registrarse
-- Se ejecuta automáticamente cuando Supabase Auth crea un usuario
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  -- Insertar perfil en public.users
  insert into public.users (id, email)
  values (new.id, new.email);

  -- Crear portafolio por defecto
  insert into public.portfolios (user_id)
  values (new.id);

  -- Crear preferencias de notificación por defecto
  insert into public.notification_preferences (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
