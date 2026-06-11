-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (auto-created on signup via trigger)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  total_generations integer not null default 0,
  created_at timestamptz not null default now()
);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text not null default '',
  thumbnail_url text not null default '',
  style_preset text not null default 'cinematic',
  is_public boolean not null default false,
  scene_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Characters
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  description text not null default '',
  reference_image_url text not null default '',
  mime_type text not null default 'image/jpeg',
  created_at timestamptz not null default now()
);

-- Scenes
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  scene_number integer not null,
  prompt text not null default '',
  status text not null default 'pending',
  generated_image_url text not null default '',
  error_message text not null default '',
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_updated_at on public.projects(updated_at desc);
create index idx_characters_project_id on public.characters(project_id);
create index idx_scenes_project_id on public.scenes(project_id);
create index idx_scenes_order on public.scenes(project_id, scene_number);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.characters enable row level security;
alter table public.scenes enable row level security;

-- Profiles policies
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Projects policies
create policy "projects select" on public.projects for select
  using (auth.uid() = user_id or is_public = true);
create policy "projects insert" on public.projects for insert
  with check (auth.uid() = user_id);
create policy "projects update" on public.projects for update
  using (auth.uid() = user_id);
create policy "projects delete" on public.projects for delete
  using (auth.uid() = user_id);

-- Characters policies (inherit project ownership)
create policy "characters select" on public.characters for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and (p.user_id = auth.uid() or p.is_public)
  ));
create policy "characters insert" on public.characters for insert
  with check (exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));
create policy "characters update" on public.characters for update
  using (exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));
create policy "characters delete" on public.characters for delete
  using (exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));

-- Scenes policies
create policy "scenes select" on public.scenes for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and (p.user_id = auth.uid() or p.is_public)
  ));
create policy "scenes insert" on public.scenes for insert
  with check (exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));
create policy "scenes update" on public.scenes for update
  using (exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));
create policy "scenes delete" on public.scenes for delete
  using (exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage buckets (run these in Supabase dashboard → Storage)
-- insert into storage.buckets (id, name, public) values ('character-references', 'character-references', true);
-- insert into storage.buckets (id, name, public) values ('generated-scenes', 'generated-scenes', true);
-- Storage policies (allow authenticated users to upload):
-- create policy "auth upload character-references" on storage.objects for insert with check (bucket_id = 'character-references' and auth.role() = 'authenticated');
-- create policy "public read character-references" on storage.objects for select using (bucket_id = 'character-references');
-- create policy "auth upload generated-scenes" on storage.objects for insert with check (bucket_id = 'generated-scenes' and auth.role() = 'authenticated');
-- create policy "public read generated-scenes" on storage.objects for select using (bucket_id = 'generated-scenes');
