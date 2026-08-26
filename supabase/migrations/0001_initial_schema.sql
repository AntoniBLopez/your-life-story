create extension if not exists pgcrypto;

create type public.date_precision as enum ('day', 'month', 'year');
create type public.life_area as enum ('health', 'relationships', 'work', 'education', 'home', 'identity', 'finances', 'other');
create type public.change_direction as enum ('improved', 'difficult', 'mixed', 'neutral');
create type public.entry_link_type as enum ('related', 'consequence');
create type public.family_relationship_type as enum ('parent', 'partner', 'sibling');
create type public.chat_role as enum ('user', 'assistant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 2 and 80),
  locale text not null default 'es' check (locale in ('es', 'en')),
  ai_consent_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.life_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date,
  date_precision public.date_precision not null default 'day',
  title text not null check (char_length(title) between 2 and 160),
  narrative text,
  life_area public.life_area not null default 'other',
  change_direction public.change_direction not null default 'mixed',
  difficulty text,
  learning text,
  transformation text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint life_entries_date_order check (end_date is null or end_date >= start_date)
);

create table public.life_entry_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_entry_id uuid not null references public.life_entries(id) on delete cascade,
  target_entry_id uuid not null references public.life_entries(id) on delete cascade,
  relation public.entry_link_type not null default 'related',
  created_at timestamptz not null default now(),
  constraint life_entry_links_not_self check (source_entry_id <> target_entry_id),
  unique (source_entry_id, target_entry_id, relation)
);

create table public.entry_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.life_entries(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table public.family_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 160),
  birth_date date,
  birth_date_precision public.date_precision,
  death_date date,
  death_date_precision public.date_precision,
  birth_country text,
  birth_city text,
  is_subject boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_people_date_order check (death_date is null or birth_date is null or death_date >= birth_date)
);

create unique index family_people_one_subject_per_user on public.family_people (user_id) where is_subject;

create table public.family_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_person_id uuid not null references public.family_people(id) on delete cascade,
  target_person_id uuid not null references public.family_people(id) on delete cascade,
  relationship_type public.family_relationship_type not null,
  created_at timestamptz not null default now(),
  constraint family_relationships_not_self check (source_person_id <> target_person_id),
  unique (source_person_id, target_person_id, relationship_type)
);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Life reflections',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role public.chat_role not null,
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index life_entries_user_date_idx on public.life_entries (user_id, start_date, created_at);
create index life_entry_links_user_idx on public.life_entry_links (user_id, source_entry_id);
create index entry_attachments_entry_idx on public.entry_attachments (user_id, entry_id);
create index family_people_user_idx on public.family_people (user_id);
create index family_relationships_user_idx on public.family_relationships (user_id);
create index chat_messages_thread_idx on public.chat_messages (user_id, thread_id, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger life_entries_set_updated_at before update on public.life_entries for each row execute function public.set_updated_at();
create trigger family_people_set_updated_at before update on public.family_people for each row execute function public.set_updated_at();
create trigger chat_threads_set_updated_at before update on public.chat_threads for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''), coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'es'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.life_entries enable row level security;
alter table public.life_entry_links enable row level security;
alter table public.entry_attachments enable row level security;
alter table public.family_people enable row level security;
alter table public.family_relationships enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create policy "Profiles are private" on public.profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Life entries are private" on public.life_entries for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Life links are private" on public.life_entry_links for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Attachments are private" on public.entry_attachments for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Family people are private" on public.family_people for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Family relationships are private" on public.family_relationships for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Chat threads are private" on public.chat_threads for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Chat messages are private" on public.chat_messages for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('life-attachments', 'life-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "Users read own life attachments" on storage.objects for select to authenticated using (bucket_id = 'life-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload own life attachments" on storage.objects for insert to authenticated with check (bucket_id = 'life-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update own life attachments" on storage.objects for update to authenticated using (bucket_id = 'life-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own life attachments" on storage.objects for delete to authenticated using (bucket_id = 'life-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
