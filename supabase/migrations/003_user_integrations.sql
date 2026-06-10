-- Gmail integration per user
create table public.user_integrations (
  id                        uuid default gen_random_uuid() primary key,
  user_id                   uuid references public.users(id) on delete cascade not null,
  provider                  text not null check (provider in ('gmail')),
  status                    text not null default 'active'
                              check (status in ('active', 'error', 'revoked', 'paused')),
  -- OAuth tokens (store encrypted in prod via Vault or app-level AES)
  access_token              text,
  refresh_token             text,
  token_expires_at          timestamptz,
  -- Provider account identifier (e.g. Gmail address) — used to route Pub/Sub pushes
  email                     text,
  -- Gmail push watch state
  gmail_history_id          text,       -- starting point for incremental history fetch
  gmail_watch_expiry        timestamptz, -- watch() expires every 7 days, must renew
  -- Deduplication: last processed message id
  last_processed_message_id text,
  -- Error tracking
  error_message             text,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now(),
  unique (user_id, provider)
);

alter table public.user_integrations enable row level security;

create policy "users_own_integrations_select" on public.user_integrations
  for select using (auth.uid() = user_id);

create policy "users_own_integrations_insert" on public.user_integrations
  for insert with check (auth.uid() = user_id);

create policy "users_own_integrations_update" on public.user_integrations
  for update using (auth.uid() = user_id);

create policy "users_own_integrations_delete" on public.user_integrations
  for delete using (auth.uid() = user_id);

-- Auto-update updated_at (reuses update_updated_at() defined in 001_initial_schema.sql)
create trigger user_integrations_updated_at
  before update on public.user_integrations
  for each row execute function update_updated_at();

-- Allow email_voucher as a file_type so Gmail-detected transactions can be stored
-- as pending file_imports records and confirmed via the same review UI.
alter table public.file_imports
  drop constraint file_imports_file_type_check;

alter table public.file_imports
  add constraint file_imports_file_type_check
    check (file_type in ('voucher_image', 'voucher_pdf', 'excel', 'email_voucher'));

-- Email vouchers have no file — make file_url nullable
alter table public.file_imports
  alter column file_url drop not null;
