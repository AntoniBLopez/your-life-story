alter type public.life_area add value if not exists 'general';

alter table public.life_entries add column if not exists life_areas public.life_area[];
update public.life_entries set life_areas = array[life_area] where life_areas is null;
alter table public.life_entries alter column life_areas set default array['general'::public.life_area];
alter table public.life_entries alter column life_areas set not null;