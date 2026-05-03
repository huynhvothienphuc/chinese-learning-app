-- ── helper function ──────────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS on profiles so the role lookup always works.
-- (profiles RLS only allows users to read their own row, which would block an
--  inline subquery from resolving correctly inside another table's policy.)

create or replace function is_superadmin()
  returns boolean language sql security definer stable as
$$
  select exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role = 'superadmin'
      and is_active = true
  );
$$;

-- ── books ─────────────────────────────────────────────────────────────────────

create table if not exists books (
  id          text primary key,
  title       text not null,
  short_title text,
  description text,
  language    text    default 'zh-Hant',
  "order"     int     default 0,
  enabled     boolean default true
);

alter table books enable row level security;

-- Anyone can read books
create policy "books_read" on books
  for select using (true);

-- Superadmin full access
create policy "books_superadmin" on books
  for all
  using (is_superadmin())
  with check (is_superadmin());

-- ── lessons ───────────────────────────────────────────────────────────────────

create table if not exists lessons (
  id         text primary key,
  book_id    text references books(id) on delete cascade,
  title      text    not null,
  "order"    int     default 0,
  theme      text,
  verified   boolean default false,
  enabled    boolean default true,
  is_free    boolean default false,
  words      jsonb   default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table lessons enable row level security;

-- All lesson metadata visible to everyone; word access for locked lessons
-- is gated at the app layer (useVocabulary disables the query for guests).
create policy "lessons_read" on lessons
  for select using (true);

-- Superadmin full access
create policy "lessons_superadmin" on lessons
  for all
  using (is_superadmin())
  with check (is_superadmin());

-- ── lessons_preview view ──────────────────────────────────────────────────────
-- Public metadata view — no words column, used for lesson list with lock icons.
-- Intentionally public: metadata has no sensitive content.

create or replace view lessons_preview as
  select id, book_id, title, "order", theme, verified, enabled, is_free, updated_at
  from lessons;

grant select on lessons_preview to anon, authenticated;
