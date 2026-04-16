-- ============================================================
-- Run this in Supabase SQL Editor (safe to run on existing tables)
-- ============================================================

-- 1. Enable pgcrypto for password hashing
create extension if not exists pgcrypto;

-- 2. Enable RLS (idempotent)
alter table user_books enable row level security;
alter table user_sections enable row level security;
alter table profiles enable row level security;

-- 3. RLS policies — drop first to avoid duplicates
drop policy if exists "owner" on user_books;
drop policy if exists "owner" on user_sections;
drop policy if exists "public_shared" on user_books;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own_username" on profiles;

create policy "owner" on user_books for all using (auth.uid() = user_id);
create policy "owner" on user_sections for all using (auth.uid() = user_id);
-- Guests can read publicly shared books (share_enabled = true, share_type = 'public')
create policy "public_shared" on user_books for select using (share_enabled = true and share_type = 'public');

-- Profiles: users can only read their own profile
-- Insert is handled by the DB trigger (SECURITY DEFINER) — no client insert allowed
-- Users can update their username only — role and is_active are protected
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);

create policy "profiles_update_own_username" on profiles
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    -- Prevent clients from changing role or is_active
    and role = (select role from profiles where user_id = auth.uid())
    and is_active = (select is_active from profiles where user_id = auth.uid())
  );

-- 4. Ensure share columns exist (safe if already there)
alter table user_books add column if not exists share_enabled boolean default false;
alter table user_books add column if not exists share_type text default 'public';
alter table user_books add column if not exists share_token uuid default gen_random_uuid();
alter table user_books add column if not exists share_password_hash text;

-- 5. RPCs for sharing
create or replace function get_shared_book(p_token uuid)
returns json language plpgsql security definer as $$
declare result json;
declare book_exists boolean;
begin
  -- Check if the token resolves to any enabled shared book at all
  select exists(
    select 1 from user_books b
    where b.share_token = p_token and b.share_enabled = true
  ) into book_exists;

  if not book_exists then
    return null;
  end if;

  -- Token is valid; try to return data for public books
  select json_build_object(
    'id', b.id,
    'title', b.title,
    'description', b.description,
    'sections', (
      select json_agg(
        json_build_object('id', s.id, 'title', s.title, 'words', s.words)
        order by s."order"
      )
      from user_sections s where s.book_id = b.id
    )
  ) into result
  from user_books b
  where b.share_token = p_token
    and b.share_enabled = true
    and b.share_type = 'public';

  -- If still null here, the book exists but is private — signal that
  if result is null then
    return json_build_object('private', true);
  end if;

  return result;
end;
$$;

create or replace function verify_shared_book(p_token uuid, p_password text)
returns json language plpgsql security definer as $$
declare result json;
begin
  select json_build_object(
    'id', b.id,
    'title', b.title,
    'description', b.description,
    'sections', (
      select json_agg(
        json_build_object('id', s.id, 'title', s.title, 'words', s.words)
        order by s."order"
      )
      from user_sections s where s.book_id = b.id
    )
  ) into result
  from user_books b
  where b.share_token = p_token
    and b.share_enabled = true
    and b.share_type = 'private'
    and b.share_password_hash = crypt(p_password, b.share_password_hash);
  return result;
end;
$$;

-- Returns id, title, description, share_enabled for all publicly shared books (safe for guests)
create or replace function list_shared_books()
returns json language plpgsql security definer as $$
begin
  return (
    select json_agg(
      json_build_object('id', b.id, 'title', b.title, 'description', b.description, 'share_enabled', b.share_enabled)
      order by b.created_at desc
    )
    from user_books b
    where b.share_enabled = true
  );
end;
$$;

-- ============================================================
-- Auto-create profile for new OAuth users (e.g. Google sign-in)
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, username, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'member',
    true
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function set_share_password(p_book_id uuid, p_password text)
returns void language plpgsql security definer as $$
begin
  update user_books
  set share_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_book_id and user_id = auth.uid();
end;
$$;
