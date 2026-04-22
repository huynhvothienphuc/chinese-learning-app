# Chinese Learning App — Full Build Specification

Build a production-ready Chinese vocabulary learning web app from scratch. Follow the phases at the bottom in order — each phase must pass its acceptance criteria before moving on.

---

## 1. Product Summary

A flashcard + quiz + writing app for learners of Traditional Chinese, built around *A Course in Contemporary Chinese* (6 books). Primary audience: Vietnamese students and self-learners; secondary: English-speaking learners. Teachers can author their own books, share them with students via token links, and students can track progress if they sign in.

**Core experience:** pick a book → pick a lesson → study (Flashcard / Quiz / Write / Review list). **Guest mode is first-class** — the app is fully usable without signing in.

---

## 2. Non-Goals (do NOT build)

- Spaced repetition scheduling (SM-2 / Anki-style) — out of scope
- Audio recording / pronunciation grading
- Multi-language UI beyond English + Vietnamese
- Mobile native apps
- Payment / subscription flows
- Real-time collaborative editing
- Offline-first PWA (beyond what localStorage gives for free)

---

## 3. Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite |
| Routing | React Router DOM v6 (explicit `<Routes>`) |
| Styling | Tailwind CSS 3, CSS variables for theming, `clsx` + `tailwind-merge` via a `cn()` helper |
| Client state | Zustand — **auth store only** |
| Server state | TanStack Query v5 |
| Backend | Supabase (Auth + Postgres + RLS + RPCs) |
| Auth | Google OAuth (primary) + hidden email/password for staff |
| Icons | `lucide-react` |
| Excel parsing | SheetJS (`xlsx`) — loaded lazily from CDN, not bundled |
| TTS | Web Speech API, Traditional Chinese (zh-TW / zh-HK) voice |
| Analytics | Google Analytics 4 via `gtag`; `@vercel/analytics` + `@vercel/speed-insights` |
| Hosting | Vercel |
| i18n | Custom `localeMap = { en, vi }`, flat keys, default `vi` |

**Env vars** (all `VITE_*` so they reach the client):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GA_MEASUREMENT_ID=
VITE_MAINTENANCE_MODE=false
```

---

## 4. Data Model

### 4.1 Tables

```sql
-- Users
create table profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text,
  role       text not null default 'member'
             check (role in ('member', 'teacher', 'admin', 'superadmin')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Student-uploaded vocab sets (max 3 per user, 100 words each)
-- Items stored as JSONB array — NOT normalized to a separate table.
create table user_vocab_sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(user_id) on delete cascade,
  title      text not null,
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Teacher-authored books (shareable)
create table user_books (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(user_id) on delete cascade,
  title                text not null,
  description          text,
  share_enabled        boolean not null default false,
  share_type           text not null default 'public'
                       check (share_type in ('public', 'private')),
  share_token          uuid not null default gen_random_uuid(),
  share_password_hash  text,
  created_at           timestamptz not null default now()
);

-- Teacher-authored sections under a user_book
-- Words stored as JSONB array on the section — NOT normalized.
create table user_sections (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references user_books(id) on delete cascade,
  user_id    uuid not null references profiles(user_id) on delete cascade,
  title      text not null,
  "order"    int not null default 0,
  words      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Quiz completion stats (system books + teacher books)
create table user_lesson_stats (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(user_id) on delete cascade,
  book_id       text not null,       -- 'book1' | user_books.id as string
  section_id    text not null,       -- 'section1' | user_sections.id as string
  section_title text not null,
  best_score    int  not null default 0,
  total         int  not null default 0,
  attempt_count int  not null default 0,
  last_attempt  timestamptz not null default now(),
  unique (user_id, book_id, section_id)
);

-- Per-word seen/correct tracking
create table user_word_stats (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(user_id) on delete cascade,
  book_id       text not null,
  section_id    text not null,
  item_id       text not null,       -- word id (string — JSON ints are cast to string)
  seen_count    int  not null default 0,
  correct_count int  not null default 0,
  last_seen     timestamptz not null default now(),
  unique (user_id, book_id, section_id, item_id)
);

-- General feedback
create table feedback (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Per-word feedback (report issue on a specific word)
create table word_feedback (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  book_id    text,
  section_id text,
  word_id    text,
  chinese    text,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 4.2 Triggers

```sql
-- Auto-create profile on new OAuth user (runs with SECURITY DEFINER)
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, username, role, is_active)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.email),
          'member',
          true)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Enforce 3-set limit per user
create or replace function check_vocab_set_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from user_vocab_sets where user_id = new.user_id) >= 3 then
    raise exception 'SET_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

create trigger trg_vocab_set_limit
  before insert on user_vocab_sets
  for each row execute function check_vocab_set_limit();
```

### 4.3 RLS Policies

```sql
alter table profiles           enable row level security;
alter table user_vocab_sets    enable row level security;
alter table user_books         enable row level security;
alter table user_sections      enable row level security;
alter table user_lesson_stats  enable row level security;
alter table user_word_stats    enable row level security;
alter table feedback           enable row level security;
alter table word_feedback      enable row level security;

-- profiles: read own; username-only self-update; role/is_active protected
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles_update_own_username" on profiles
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and role       = (select role from profiles where user_id = auth.uid())
    and is_active  = (select is_active from profiles where user_id = auth.uid())
  );

-- owner-only for the rest
create policy "owner_vocab_sets" on user_vocab_sets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_books" on user_books for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Guests can SELECT public shared books (used by /shared/:token landing)
create policy "public_shared_books" on user_books for select
  using (share_enabled = true and share_type = 'public');

create policy "owner_sections" on user_sections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_lesson_stats" on user_lesson_stats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_word_stats" on user_word_stats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Feedback: anyone (auth or anon) can insert; only superadmin can read/update/delete
create policy "feedback_insert_any" on feedback for insert
  with check (true);
create policy "feedback_read_superadmin" on feedback for select
  using (exists (select 1 from profiles where user_id = auth.uid() and role = 'superadmin'));
create policy "feedback_modify_superadmin" on feedback for update
  using (exists (select 1 from profiles where user_id = auth.uid() and role = 'superadmin'));
create policy "feedback_delete_superadmin" on feedback for delete
  using (exists (select 1 from profiles where user_id = auth.uid() and role = 'superadmin'));

-- Same pattern for word_feedback
```

### 4.4 RPCs (Postgres functions, all `security definer`)

```sql
-- ── Quiz stats ──────────────────────────────────────────────
create or replace function upsert_lesson_stat(
  p_user_id uuid, p_book_id text, p_section_id text,
  p_section_title text, p_score int, p_total int
) returns void language plpgsql security definer as $$
begin
  insert into user_lesson_stats (user_id, book_id, section_id, section_title,
                                 best_score, total, attempt_count, last_attempt)
  values (p_user_id, p_book_id, p_section_id, p_section_title, p_score, p_total, 1, now())
  on conflict (user_id, book_id, section_id) do update
    set best_score    = greatest(user_lesson_stats.best_score, excluded.best_score),
        total         = excluded.total,
        section_title = excluded.section_title,
        attempt_count = user_lesson_stats.attempt_count + 1,
        last_attempt  = now();
end;
$$;

create or replace function increment_word_stat(
  p_user_id uuid, p_book_id text, p_section_id text,
  p_item_id text, p_correct boolean
) returns void language plpgsql security definer as $$
begin
  insert into user_word_stats (user_id, book_id, section_id, item_id,
                               seen_count, correct_count, last_seen)
  values (p_user_id, p_book_id, p_section_id, p_item_id,
          1, case when p_correct then 1 else 0 end, now())
  on conflict (user_id, book_id, section_id, item_id) do update
    set seen_count    = user_word_stats.seen_count + 1,
        correct_count = user_word_stats.correct_count + (case when p_correct then 1 else 0 end),
        last_seen     = now();
end;
$$;

-- ── Sharing ─────────────────────────────────────────────────
create or replace function list_shared_books()
returns json language plpgsql security definer as $$
begin
  return (
    select json_agg(
      json_build_object('id', id, 'title', title, 'description', description)
      order by created_at desc
    )
    from user_books where share_enabled = true
  );
end;
$$;

create or replace function get_shared_book(p_token uuid)
returns json language plpgsql security definer as $$
declare result json; exists_any boolean;
begin
  select exists(select 1 from user_books
                where share_token = p_token and share_enabled = true)
    into exists_any;
  if not exists_any then return null; end if;

  select json_build_object(
    'id', b.id, 'title', b.title, 'description', b.description,
    'sections', (
      select json_agg(json_build_object('id', s.id, 'title', s.title, 'words', s.words)
                     order by s."order")
      from user_sections s where s.book_id = b.id
    )
  ) into result
  from user_books b
  where b.share_token = p_token
    and b.share_enabled = true
    and b.share_type = 'public';

  if result is null then
    return json_build_object('private', true);
  end if;
  return result;
end;
$$;

create or replace function verify_shared_book(p_token uuid, p_password text)
returns json language plpgsql security definer as $$
begin
  return (
    select json_build_object(
      'id', b.id, 'title', b.title, 'description', b.description,
      'sections', (
        select json_agg(json_build_object('id', s.id, 'title', s.title, 'words', s.words)
                       order by s."order")
        from user_sections s where s.book_id = b.id
      )
    )
    from user_books b
    where b.share_token = p_token
      and b.share_enabled = true
      and b.share_type = 'private'
      and b.share_password_hash = crypt(p_password, b.share_password_hash)
  );
end;
$$;

create or replace function set_share_password(p_book_id uuid, p_password text)
returns void language plpgsql security definer as $$
begin
  update user_books
  set share_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_book_id and user_id = auth.uid();
end;
$$;

-- ── Admin (manages teachers) ────────────────────────────────
create or replace function list_teachers()
returns table(user_id uuid, email text, is_active boolean)
language plpgsql security definer as $$
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;
  return query
    select p.user_id, u.email, p.is_active
    from profiles p join auth.users u on u.id = p.user_id
    where p.role = 'teacher'
    order by p.created_at desc;
end;
$$;

create or replace function add_teacher(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;
  update profiles set role = 'teacher', is_active = true where user_id = p_user_id;
end;
$$;

create or replace function toggle_teacher_active(p_user_id uuid)
returns boolean language plpgsql security definer as $$
declare new_state boolean;
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;
  update profiles set is_active = not is_active
    where user_id = p_user_id and role = 'teacher'
    returning is_active into new_state;
  return new_state;
end;
$$;
```

Enable extensions: `create extension if not exists pgcrypto;`

---

## 5. Static Content (public/data)

```
public/data/
├── books.json                       [{ id, title, shortTitle, description, folder, language }]
└── books/
    ├── book1/
    │   ├── sections.json            [{ id, order, title, file, enabled, theme, verified }]
    │   └── sectionN.json            { bookId, sectionId, sectionTitle, items: [...], verified }
    └── book2..book6/
```

**Vocab item canonical shape (normalized at read time):**
```js
{
  id: string,                // JSON int cast to string, fallback `${chinese}-${pinyin}-${idx}`
  chinese: string,
  pinyin: string,
  english: string,           // alias: en, meaning.en
  vietnamese: string,        // alias: vi, meaning.vi; default → english if empty
  sentenceChinese: string,   // alias: samples[0].sentence
  sentencePinyin: string,    // alias: samples[0].pinyin
  sentenceEnglish: string,   // alias: samples[0].en, translation.en
  sentenceVietnamese: string,// alias: samples[0].vi, translation.vi; default → sentenceEnglish
  samples?: [                // optional; preferred over flat sentence fields
    { sentence, pinyin, en, vi, type?, meaning?, simplified? }
  ],
  notest?: boolean,          // if true → excluded from quiz/write
  meaning: { en, vi },       // computed
  translation: { en, vi }    // computed
}
```

**Normalization rule:** always funnel JSON reads through a single `normalizeVocabularyItems(rawItems)` helper. Accept legacy field aliases. Drop rows missing `chinese` or `pinyin`.

---

## 6. Folder Structure

```
chinese-learning-app/
├── public/
│   ├── data/ ...
│   ├── logo.svg / logo.png
│   └── sponser.png
├── src/
│   ├── main.jsx                     # QueryClient + Router + auth init + ErrorBoundary
│   ├── App.jsx                      # thin shell, <Routes> only (no layout or state)
│   ├── styles/
│   │   └── index.css                # Tailwind base + theme CSS vars
│   │
│   ├── routes/
│   │   ├── ProtectedRoute.jsx       # requires auth; spinner while !authReady
│   │   └── RoleRoute.jsx            # requires role in allowed[]; redirects to /
│   │
│   ├── pages/
│   │   ├── LearnPage.jsx            # core study UI — uses useOutletContext()
│   │   ├── LoginPage.jsx
│   │   ├── StudentDashboard.jsx     # student stats
│   │   ├── MyQuizPage.jsx           # multi-book multi-section quiz builder
│   │   ├── UploadPage.jsx           # XLSX upload + set manager — uses useOutletContext()
│   │   ├── SharedBookPage.jsx       # /shared/:token
│   │   ├── FeedbackPage.jsx         # submit general feedback — uses useNavigate internally
│   │   ├── FeedbackReviewPage.jsx   # 2 tabs: general + per-word (superadmin)
│   │   ├── InfoPage.jsx             # about — uses useOutletContext()
│   │   ├── NotFoundPage.jsx
│   │   ├── AdminDashboard.jsx       # teacher management
│   │   └── teacher/
│   │       ├── TeacherDashboard.jsx
│   │       ├── BookEditor.jsx       # title/desc/share settings + section list
│   │       └── SectionEditor.jsx    # word table + add/edit/delete + XLSX
│   │
│   ├── components/
│   │   ├── study/
│   │   │   ├── Flashcard.jsx
│   │   │   ├── Quiz.jsx
│   │   │   ├── WriteMode.jsx
│   │   │   ├── WordListView.jsx     # review mode
│   │   │   └── SpeakButton.jsx
│   │   ├── layout/
│   │   │   ├── MainLayout.jsx       # owns settings/favorites/uploads; provides outlet context
│   │   │   ├── Navbar.jsx           # extracted from App.jsx; reads user/role from authStore
│   │   │   ├── StudyDeckPanel.jsx   # book + section + mode tabs
│   │   │   ├── StudyModeTabs.jsx
│   │   │   ├── SectionSelector.jsx
│   │   │   └── FavoritesPanel.jsx
│   │   ├── upload/
│   │   │   └── UploadGuide.jsx
│   │   ├── share/
│   │   │   └── ShareControls.jsx
│   │   └── ui/
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── ToggleSwitch.jsx
│   │       └── Modal.jsx            # Modal + ModalHeader + ModalBody + ModalFooter
│   │
│   ├── hooks/
│   │   ├── useVocabData.js          # useBooks / useSections / useVocabulary / prefetch
│   │   ├── useStudentData.js        # useLessonStats / useWordStats / useStudentSets
│   │   ├── useStreak.js
│   │   ├── useLocalStorageState.js
│   │   └── useStudySession.js       # owns mode/index/flip/quiz/write/shuffle/favorites state
│   │
│   ├── store/
│   │   └── authStore.js             # Zustand — auth only (user, role, authReady)
│   │
│   ├── lib/
│   │   ├── supabase.js              # client + all service fns
│   │   ├── utils.js                 # cn, shuffleArray, normalizeVocabularyItems, buildQuizChoices, getItemMeaning, getSentenceMeaning, formatSectionName
│   │   ├── excel.js                 # parseVocabularyWorkbook, exportVocabularyToExcel (lazy SheetJS)
│   │   ├── speak.js                 # Web Speech API
│   │   ├── analytics.js             # initGoogleAnalytics, trackEvent
│   │   └── constants.js             # USER_UPLOAD_BOOK_ID, session keys, UPLOADED_LESSONS_KEY,
│   │                                #   FAVORITES_KEY, LANGUAGE_KEY, MAX_UPLOAD_BYTES
│   │
│   └── locales/
│       ├── index.js                 # { en, vi } map
│       ├── en.js
│       └── vi.js
│
├── .env / .env.local
├── index.html
├── tailwind.config.js
├── vite.config.js (with `@` → `src` alias)
├── jsconfig.json
├── vercel.json
└── package.json
```

**No** `middleware.js`. **No** `/api/*` routes. The app speaks to Supabase directly.

---

## 7. Routes

```jsx
<Routes>
  {/* Standalone full-page layouts */}
  <Route path="/login"          element={<LoginPage />} />
  <Route path="/shared/:token"  element={<SharedBookPage />} />

  {/* Protected standalone (own layout each) */}
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<StudentDashboard />} />
  </Route>

  {/* Teacher OR admin */}
  <Route element={<RoleRoute allowed={['teacher', 'admin']} />}>
    <Route path="/teacher"                                       element={<TeacherDashboard />} />
    <Route path="/teacher/books/:bookId"                         element={<BookEditor />} />
    <Route path="/teacher/books/:bookId/sections/:sectionId"     element={<SectionEditor />} />
  </Route>

  {/* Admin only */}
  <Route element={<RoleRoute allowed={['admin']} />}>
    <Route path="/admin" element={<AdminDashboard />} />
  </Route>

  {/* Superadmin only */}
  <Route element={<RoleRoute allowed={['superadmin']} />}>
    <Route path="/feedback-review" element={<FeedbackReviewPage />} />
  </Route>

  {/* Main layout (navbar + footer) — all guest-accessible routes */}
  <Route element={<MainLayout />}>
    <Route path="/"            element={<LearnPage />} />
    <Route path="/quiz"        element={<MyQuizPage />} />
    <Route path="/upload-word" element={<UploadPage />} />
    <Route path="/info"        element={<InfoPage />} />
    <Route path="/feedback"    element={<FeedbackPage />} />
  </Route>

  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

**Guards:** `ProtectedRoute` redirects to `/login` if `!user && authReady`. `RoleRoute` redirects to `/` if role not allowed. Both render a centered spinner while `!authReady`.

**Layout context:** `MainLayout` owns all shared state (settings, favorites, uploadedLessons, books, supabaseSets) and passes it to child pages via `<Outlet context={ctx} />`. Child pages consume it with `useOutletContext()`. This avoids prop-drilling and keeps `App.jsx` as a thin routes-only shell.

**Outlet context shape (`MainLayout → children`):**
```js
{
  t, selectedLanguage,
  books, booksLoading,
  favorites, favoriteVocabulary, favoriteKeySet,
  toggleFavorite, removeFavorite, isFavorite,
  isFavoritesOpen, setIsFavoritesOpen,
  uploadedLessons, setUploadedLessons,
  supabaseSets,
  role, user,
}
```

---

## 8. Auth Flow

**Zustand store** (`authStore.js`) holds: `{ user, role, authReady, roleReady }`. `user` / `role` start `null`. `authReady` flips to `true` after the initial `getSession()` resolves — this unblocks queries and route guards. `roleReady` flips after role is fetched — this unblocks the student dashboard.

**Startup sequence:**

1. `main.jsx` calls `prefetchFromSession(queryClient)` *before* React mounts. This reads `selected-book` / `selected-sections-by-book` from sessionStorage and fires `prefetchSections` + `prefetchVocab` in parallel — warms the cache so books/sections/vocab resolve by the time the user lands on LearnPage. **Don't await it.**
2. `main.jsx` renders `<Root>`; `<Root>` calls `initAuth()` in a `useEffect`.
3. `initAuth()` calls `supabase.auth.getSession()` once, then subscribes to `onAuthStateChange`.
4. **Inside `resolveAuth(session, event)`:**
   - If `window.location.hash.includes('access_token')`, strip the hash: `history.replaceState(null, '', location.pathname)`. (Supabase leaves the OAuth token hash behind otherwise.)
   - If no session → set `{ user: null, role: null, authReady: true, roleReady: true }`.
   - If `event === 'TOKEN_REFRESHED'` → only update `user`; skip role fetch.
   - Otherwise → set `{ user, authReady: true }` (unblock queries immediately), then:
     - If `event === 'SIGNED_IN'`, call `ensureProfile(user)` (insert on conflict-do-nothing; the DB trigger should already have done it but this is a safety net for pre-existing users).
     - Fetch `profiles.role` + `is_active`. If `is_active === false` → `signOut()`, show "Account deactivated" message.
     - Set `{ role, roleReady: true }`.
5. `onAuthStateChange` with `event === 'INITIAL_SESSION'` is ignored — already handled by the explicit `getSession()` above.

**Sign out:** optimistically clear `{ user, role }` and `sb-*` localStorage keys, *then* await `supabase.auth.signOut()` (catch errors silently). The optimistic clear prevents flicker.

**Sign-in methods:**
- `signInWithGoogle()` — primary, button on `/login`.
- Hidden email/password form on `/login` (toggled by clicking something subtle — e.g. the logo 3 times, or a small link). For staff only.

---

## 9. User Flows

### 9.1 Guest (no login)
1. Lands on `/`. Books load from `/data/books.json`. First book auto-selected (from sessionStorage if available). Sections load. First enabled section auto-selected.
2. Picks Flashcard / Quiz / Write / Lesson Words from the tabs.
3. Hearts a word → saved to `favorites` in localStorage. Favorites visible via panel.
4. Can upload XLSX → saved to `uploaded-lessons-json` in localStorage as a pseudo-book "User upload". Max 1 MB, max 100 rows.
5. Can visit `/shared/:token` to view a teacher-shared book (public or password-protected).
6. **Cannot** see `/dashboard`, `/teacher/*`, `/admin`, `/feedback-review`.

### 9.2 Signed-in student (`role: 'member'`)
1. Clicks "Sign in with Google" → Google redirect → back to `/` with profile row created.
2. Everything guest can do, plus:
3. XLSX uploads go to `user_vocab_sets` (max 3 perm slots; overflow falls back to localStorage with a warning).
4. Quiz completions call `upsert_lesson_stat` RPC; each answered word calls `increment_word_stat`.
5. `/dashboard` shows quiz count, average, recent 10 attempts.

### 9.3 Teacher
- `/teacher` — list own books, create new, delete.
- `/teacher/books/:id` — edit title/desc, toggle share (public/private), generate/copy share link, set password, list sections, add section, reorder.
- `/teacher/books/:id/sections/:sid` — word table, add/edit/delete, XLSX import with dedupe by `chinese`.
- Teacher books appear in the student book picker under their own entries (fetched via `list_shared_books` RPC) only if `share_enabled = true` and `share_type = 'public'`.

### 9.4 Admin
- `/admin` — list teachers (`list_teachers` RPC), add by user UUID, toggle active.

### 9.5 Superadmin
- `/feedback-review` — 2 tabs: General feedback, Word feedback. Each row: message, timestamp, context (for word feedback: book/section/word), toggle resolved, delete.

---

## 10. Feature Specs

### 10.1 LearnPage (`/`)

**Top-level state (useStudySession hook):**
- `mode: 'flashcard' | 'quiz' | 'write' | 'review'` — `'review'` is default
- `index: number`
- `isFlipped: boolean` (flashcard only)
- `quizState: { answered, wrongAnswers, score, isComplete }`
- `writeState: { typed, submitted, isCorrect, wrongAnswers, score, isComplete }`
- `deckSource: 'all' | 'favorites'`
- `isShuffled: boolean`

**Deck selector (StudyDeckPanel):**
- Book `<Select>` — options: static books + teacher-shared books + "User upload" (if guest has uploads) + user's own `user_vocab_sets`.
- Section `<Select>` — uses `SectionSelector` which disables rows with `enabled === false` and labels them "Coming soon".
- Mode tabs: Flash Card / Quiz / Write / Lesson Words.

**Persistence:**
- `selected-book` in sessionStorage.
- `selected-sections-by-book` in sessionStorage as `{ [bookId]: sectionFile }`.
- `dark-mode`, `app-theme`, `font-size`, `selected-language` in localStorage.
- `favorite-vocabulary`, `uploaded-lessons-json`, `study-streak`, `sample-sentence-notice-last-seen` in localStorage.

**Keyboard shortcuts (flashcard mode only, not while typing in inputs):**
- `Space` / `ArrowUp` — flip
- `ArrowLeft` / `,` / `<` — prev
- `ArrowRight` / `.` / `>` — next

**Verified-notice modal:** when the current section has `verified === false`, show a daily-dismissible modal (stamped by `YYYY-MM-DD` in localStorage) on first visit each day.

### 10.2 Flashcard

- Click/tap card to flip. `.flashcard-scene`/`.flashcard-inner`/`.is-flipped` CSS for 3D flip.
- Front: huge Chinese + Speak button + hint text.
- Back: Chinese + Speak + pinyin (toggle) + meaning (toggle) + sample sentence(s).
- **Sample highlighting:** split `sample.sentence` on `item.chinese`, wrap matches in `<mark>` with primary color. Render at most 2 samples if `item.samples` present; else fall back to flat `sentenceChinese`/`sentencePinyin`/`sentenceEnglish`/`sentenceVietnamese` fields.
- Heart toggle (favorites) + Shuffle toggle (only when `deckSource === 'all'`).
- Pinyin/meaning visibility controlled by a single `showDetails` toggle; resets to `false` on item change.

### 10.3 Quiz

- 4-choice MC. Distractors: same `chinese.length` first, else any; deduplicated by `chinese`; never the correct answer.
- `buildQuizChoices(pool, currentItem)` returns `[correct, ...3 distractors]` shuffled.
- After selection: correct → green ring + check; wrong → red ring + X, correct choice highlighted. "Next question" button appears.
- "Auto next" toggle (correct answers only).
- `notest: true` items excluded from the quiz pool.
- On last question: complete screen shows score %, "Start New Quiz", and "Practice N wrong words" (re-seeds with only wrongs). Review panel shows each wrong answer with the correct form + sample.
- On completion (logged-in student, `score.total > 0`): call `upsert_lesson_stat`, then invalidate `['lessonStats', userId]` and `['wordStats', userId]`.

### 10.4 WriteMode

- Shows meaning, user types the Chinese (pinyin IME expected).
- Normalize before comparing: strip ASCII + full-width parens content, strip whitespace.
- Correct → green box + pinyin under answer; wrong → red box + user's typed + correct below.
- Input autofocuses per question; card auto-scrolls into view on index change.
- Same summary pattern as Quiz (restart + retry-wrong).

### 10.5 WordListView (review)

- Searchable (matches `chinese` or `english`).
- Filter tabs: All / Favorites.
- `showDetails` toggle hides pinyin + meaning.
- Row expand → shows samples or flat sentence with Speak buttons.
- Copy-to-clipboard button on each row (1.2s "Copied" state).
- Favorite heart toggle on each row.

### 10.6 MyQuizPage (`/quiz`)

- **Multi-book, multi-section.** The user builds one quiz that can span lessons from any number of books (static books, teacher-shared books, the "User upload" pseudo-book, and the user's own `user_vocab_sets`). Flow:
  1. Pick a book from the book row → its sections render in a panel below.
  2. Toggle checkboxes on any sections → those selections stay checked when switching to another book.
  3. Repeat for as many books as needed. A single flat "Selected lessons" list at the top shows all currently-checked sections grouped by book, with per-chip remove and a "Clear all" button.
  4. Choose count (all/20/40/60) and mode (MC/Write) → Start.
- Selection state is a single `Map<scopeKey, { bookId, bookTitle, sectionFile, sectionTitle }>` keyed by `${bookId}:${sectionFile}`. Switching the active book does NOT reset this map.
- Vocab for each selected section is fetched on check and cached in `sectionVocabByScope: Record<scopeKey, VocabItem[]>` so re-visiting the book is instant.
- **Scoped IDs** (critical): each loaded item gets `id = "${bookId}:${sectionFile}:${originalId}"` before it enters the pool. Without the `bookId` prefix, two books' section1/item1 collide and the quiz marks the wrong answer as correct.
- Pool aggregation: `[...selection.values()].flatMap(scope => sectionVocabByScope[scope] ?? []) → filter(!notest) → dedupe by ${chinese}__${pinyin}`.
- Active-quiz summary header lists each selected book with its lesson chips underneath — do not merge chips across books or the user loses provenance.
- Reuses `<Quiz>` and `<WriteMode>` components with the aggregated vocabulary.
- Does **not** record stats (intentional — this is a custom review, not a lesson).

### 10.7 UploadPage (`/upload-word`)

- Download template button.
- File input (`.xlsx` only, max 1 MB).
- Upload flow:
  - Parse with SheetJS, normalize.
  - If logged-in member AND `user_vocab_sets.count < 3` → insert row, invalidate `['studentSets', userId]`.
  - Else → prepend to `uploaded-lessons-json` localStorage array.
  - If parsed > 100 rows, keep first 100 and show "Trimmed from N to 100" warning.
- Show two lists: "Permanent sets" (Supabase) with delete buttons; "Browser only" (localStorage) with delete buttons.

### 10.8 SharedBookPage (`/shared/:token`)

- Call `get_shared_book(token)`. Three outcomes:
  - `null` → "Link not found or expired."
  - `{ private: true }` → password form → `verify_shared_book(token, password)`.
  - `{ id, title, sections: [...] }` → render a read-only study view (same Flashcard/Quiz/Write/Review components), no stats tracking.

### 10.9 DashboardPage (`/dashboard`)

- 2-card summary: quiz count + average best-score %.
- Quiz history list: recent 10 sorted by `last_attempt` DESC. Each row: title, date, pass/fail icon (>= 70%), `best_score/total`, %.
- Refresh button.

### 10.10 TeacherDashboard + BookEditor + SectionEditor

- See §9.3. SectionEditor uses a wide `<table>` with all 8 fields + actions; edit opens a modal.
- Saving a section writes the entire `words` JSONB back — no partial updates. Normalize before writing.

### 10.11 AdminDashboard

- Calls `list_teachers`, `add_teacher`, `toggle_teacher_active`. UUID input for new teachers.

### 10.12 FeedbackReviewPage

- Tabs: General / Per-word. Each list sorted newest-first. Toggle resolved. Delete with confirm.

### 10.13 FeedbackPage

- Single textarea, submit with client rate-limit (1/min, key `feedback_last_submitted` in localStorage), length 5..1000, strip HTML tags + control chars before insert.

### 10.14 InfoPage

- Static marketing / about content. English + Vietnamese.

### 10.15 Navbar

- Logo → `/`.
- "Create Quiz" button → `/quiz`.
- Language picker (flag-only collapsed, full labels in `<select>`).
- Font size (desktop only, opens native `<select>`).
- Theme dropdown (green/orange/teal; dark mode separate toggle).
- Dark mode toggle.
- Feedback link (desktop).
- About link (guest only).
- Mobile Settings popover consolidates the above.
- Row 2 (authed users only): avatar + name/masked-email + role-based buttons (Dashboard for member, Teacher Dashboard for teacher, Admin Dashboard for admin, Feedback Review for superadmin) + Sign out.
- Masking rule: for members and Google users, show `full_name` or email local-part. For staff with email login, mask: `ab***@domain.com`.

---

## 11. Component Contracts

### TanStack Query keys + options

| Key | Source | `staleTime` | `gcTime` | Notes |
|---|---|---|---|---|
| `['books', userId \|\| null]` | `fetch('/data/books.json')` + `rpc('list_shared_books')` | 5 min | default | `enabled: authReady` |
| `['sections', bookId]` | static JSON OR `user_sections` for teacher books | 0 (SWR) | default | `enabled: !!bookId` |
| `['vocab', bookId, sectionFile]` | static JSON OR from `section._words` | 0 (SWR) | 30 min | `placeholderData: prev` |
| `['studentSets', userId]` | `select * from user_vocab_sets` | default | default | |
| `['lessonStats', userId]` | `select * from user_lesson_stats` | 0 | default | always refetch for dashboard |
| `['wordStats', userId]` | `select * from user_word_stats` | 0 | default | |

**Invalidations:**
- After `upsert_lesson_stat` → invalidate `lessonStats` + `wordStats`.
- After `saveStudentSet` / `deleteStudentSet` → invalidate `studentSets`.
- After teacher section save → invalidate `['sections', bookId]` + `['vocab', bookId, sectionId]`.

### Component props (key components only)

```jsx
<Flashcard item onFlip flipped isFavorite onToggleFavorite language canShuffle isShuffled onShuffle t />

<Quiz vocabulary allChoices currentIndex answeredQuestion onAnswer onNext score isComplete wrongAnswers onRestart onRetryWrong language t />

<WriteMode vocabulary language t />   // owns its own state via internal hook

<WordListView vocabulary isFavorite onToggleFavorite language t bookId sectionId />

<StudyDeckPanel t books selectedBook onBookChange sections selectedSection onSectionChange activeTab onTabChange booksLoading />

<SectionSelector sections selectedSection onChange noSectionsLabel comingSoonLabel lessonLabel />

<SpeakButton text label size variant className />

<ToggleSwitch checked onChange label className />
```

### `buildQuizChoices(pool, currentItem) → VocabItem[4]`

Dedupe pool by `chinese` (excluding `currentItem`), partition by `chinese.length === currentItem.chinese.length`, shuffle each partition, concat (same-length first), slice 3, prepend correct, shuffle. Always returns 4 items if pool ≥ 4.

---

## 12. i18n Conventions

- Flat keys only, no nesting. English source is canonical.
- Key naming: `camelCase`, describe the UI context (`flipCardAction`, `startNewQuiz`, `myQuizCountAll`).
- Interpolation via `.replace('{name}', value)` — no template engine.
- Default language: `vi`. Persist in localStorage `selected-language`.
- Helper: `getItemMeaning(item, lang)` and `getSentenceMeaning(item, lang)` fall back to the other language prefixed with its label (e.g. `English: Hello`) when the preferred is empty.
- Target key count: ~200 keys. Examples:
  - Nav: `appTitle`, `learn`, `feedbackNav`, `aboutNavLabel`
  - Study: `flipCardAction`, `tapToFlip`, `score`, `previous`, `next`, `showPinyin`, `mix`, `resetOrder`
  - Quiz: `quizSummary`, `nextQuestion`, `viewSummary`, `correct`, `wrongAnswer`, `correctAnswer`, `startNewQuiz`, `autoNext`
  - Write: `writeTab`, `writeModeSubmit`, `writeModeRetry`
  - Upload: `uploadTitle`, `xlsxOnly`, `maxSize`, `uploadNeedsRows`, `uploadTrimmedWarning`
  - MyQuiz: `myQuizTitle`, `myQuizStart`, `myQuizSelectAll`, `myQuizCountAll`
  - Dashboard: keep English-only for v1 (acceptable).

---

## 13. Styling & Theming

- Tailwind with a `cn()` helper (`clsx` + `tailwind-merge`).
- Themes: 3 named (green / orange / teal) via `data-theme="green"` on `<html>`. Each theme defines CSS vars: `--color-primary`, `--color-primary-foreground`, `--color-theme-border`, `--color-theme-surface`, `--color-theme-surface-secondary`.
- Dark mode: `document.documentElement.classList.toggle('dark')`.
- Font size: `--app-font-size` CSS var set from a 6-step scale (`sm=16px`..`xxl=26px`); cards and word text use `style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}`.
- Card components accept `className` and merge via `cn()`.
- Consistent radii: cards `rounded-3xl`, buttons `rounded-2xl`, small chips `rounded-full`.
- Animations: `animate-float-in` for panels appearing; `animate-text-zoom` for flashcard front; flashcard 3D flip via `.flashcard-inner` + `.is-flipped` + `transform-style: preserve-3d`.

---

## 14. Known Pitfalls (hard-won lessons)

1. **OAuth hash hangs around.** Supabase leaves `#access_token=…` in the URL after the redirect. Strip it inside `resolveAuth` on *every* call — `INITIAL_SESSION` or `SIGNED_IN`, whichever fires first.
2. **Don't refetch role on `TOKEN_REFRESHED`.** This event fires silently on tab refocus; re-running `fetchRole` causes UI flicker.
3. **Guard `/dashboard` with `roleReady`, not `authReady`.** `authReady` alone will briefly show the member dashboard to teachers/admins.
4. **Profile may already exist for OAuth users** thanks to the DB trigger. `ensureProfile()` must use `on conflict (user_id) do nothing` (don't throw).
5. **`is_active = false` accounts must be signed out immediately** after role fetch, with a message.
6. **Sessions with `maybeSingle` vs `single`:** use `maybeSingle` for "might not exist" reads; `single` throws on 0 rows.
7. **Vocab IDs collide across sections AND books** when aggregating for MyQuiz. Scope every item to `${bookId}:${sectionFile}:${itemId}` — the `bookId` prefix is what makes cross-book selection work, do not drop it.
8. **Sample sentence highlighting**: split on `item.chinese` and wrap each `<mark>`. Don't regex-replace — Chinese strings can contain characters that need escaping.
9. **SheetJS is ~1 MB.** Load it lazily from the CDN script tag on first XLSX action, never bundle it.
10. **Favorites key** must include book + section + chinese + pinyin. Otherwise moving the same word between sections desyncs.
11. **`notest: true` words** must be filtered before building quiz choice pools AND before computing available-count in MyQuizPage.
12. **`WriteMode` answer normalization** must strip parens content: e.g. `打 (球)` → `打`. Otherwise notes in parentheses trigger false negatives.
13. **`prefetchFromSession()` must run before React mounts.** If it runs inside a `useEffect`, the first render waterfall returns.
14. **`staleTime: 0` + `placeholderData: (prev) => prev`** — this is the combo for daily-updated JSON: refetch in background but never flash blank.
15. **Keyboard shortcuts** must bail out when `event.target.tagName` is INPUT/TEXTAREA/SELECT/BUTTON; otherwise typing pinyin in Write mode triggers flip/navigation.
16. **Excel column aliases:** `chinese`, `pinyin`, `vietnamese` required; also accept `meaning_vietnamese`/`vi` and `english`/`meaning_english`/`en`. Normalize headers to `lower_snake_case` before lookup.
17. **Don't use `id="sheetjs-cdn-script"` duplicated** — check `document.getElementById` to reuse an in-flight script tag.
18. **Maintenance mode must short-circuit before auth init** — otherwise users see a flash of the real app.

---

## 15. Build Phases

Work phase-by-phase. Don't start phase N+1 until phase N's acceptance criteria pass.

### Phase 1 — Foundation (compiles + routes)
- Scaffold Vite + React 19 + Tailwind + React Router.
- `jsconfig.json` + `vite.config.js` with `@` alias.
- Tailwind config with theme CSS vars + dark mode.
- Empty pages for every route in §7.
- Static Navbar (no auth yet).
- `locales/{en,vi}.js` stubs.

**Acceptance:**
- `npm run dev` boots with no console errors.
- Every route in §7 renders its placeholder.
- Language picker swaps placeholder strings.

### Phase 2 — Static content + study loop (guest mode)
- Load `books.json` + `sections.json` + `sectionN.json` via TanStack Query.
- `normalizeVocabularyItems` + `buildQuizChoices` in `lib/utils.js`.
- `useStudySession` hook.
- Components: `StudyDeckPanel`, `SectionSelector`, `Flashcard`, `Quiz`, `WriteMode`, `WordListView`, `SpeakButton`.
- Keyboard shortcuts on flashcard.
- Session + localStorage persistence (§10.1).
- Favorites via `useLocalStorageState` + `FavoritesPanel`.
- Streak via `useStreak`.
- Theme + font-size + dark mode (toggle UI + CSS vars wired).

**Acceptance:**
- Guest can pick any book/section and complete all 4 modes (flashcard/quiz/write/review).
- Favorites persist across reloads.
- Theme + dark mode + font size toggle work.
- Keyboard shortcuts work in flashcard, don't fire in write input.
- Sample sentences highlight the target word.

### Phase 3 — Auth + profiles
- Supabase client (`lib/supabase.js`).
- Zustand `authStore` with the exact startup sequence in §8.
- `profiles` table + `handle_new_user` trigger + RLS.
- `ProtectedRoute` + `RoleRoute`.
- `/login` with Google button + hidden staff email form.
- Navbar row 2 with avatar + masked email + sign out.
- `is_active = false` auto sign-out with message.

**Acceptance:**
- Google login round-trips, creates a `profiles` row, lands back on `/`.
- Hash `#access_token=…` is stripped after login.
- Deactivating a profile in Supabase signs them out on next request.
- Role gating redirects non-teachers away from `/teacher/*`.

### Phase 4 — Student data (sets + stats + dashboard)
- `user_vocab_sets` table + 3-set trigger + RLS.
- `user_lesson_stats` + `user_word_stats` + RLS + RPCs (`upsert_lesson_stat`, `increment_word_stat`).
- `useStudentData` hook (query keys per §11).
- `/upload-word` page: XLSX parse + save (member → Supabase; guest → localStorage).
- Quiz completion calls `upsert_lesson_stat`, invalidates `lessonStats`/`wordStats`.
- `/dashboard` page with summary + recent 10.
- `prefetchFromSession()` wired in `main.jsx`.
- `usePrefetchAdjacentSections` active on the study page.

**Acceptance:**
- Member can upload 3 sets; 4th attempt errors with `SET_LIMIT_REACHED`.
- Guest upload > 3 sets works (localStorage fallback).
- Completing a quiz updates the dashboard on refresh.
- Cold load of a returning-user page has vocab already in cache (no waterfall).

### Phase 5 — Teacher authoring + sharing
- `user_books`, `user_sections` tables + RLS (owner + public_shared for select).
- RPCs: `list_shared_books`, `get_shared_book`, `verify_shared_book`, `set_share_password`.
- `/teacher` dashboard (create/delete books).
- `/teacher/books/:id` — edit metadata, share toggle (public/private), generate + copy share link, set password.
- `/teacher/books/:id/sections/:sid` — word table, add/edit/delete (modal), XLSX import with dedupe.
- Teacher books appear in student book picker via `list_shared_books`.
- `/shared/:token` landing with password form for private books.

**Acceptance:**
- Teacher creates a book + section + uploads XLSX; students signed in see it in the picker.
- Public share link works for guests.
- Private share link requires the right password.
- Disabling `share_enabled` hides the book from students on next refetch.

### Phase 6 — Admin + Superadmin
- `admin` role RPCs: `list_teachers`, `add_teacher`, `toggle_teacher_active`.
- `/admin` page.
- `feedback` + `word_feedback` tables + RLS (insert=any, read/update/delete=superadmin).
- `/feedback` submit page (rate-limited, sanitized).
- `/feedback-review` page with 2 tabs.

**Acceptance:**
- Admin can add/deactivate a teacher by UUID.
- Non-admin UUID cannot access `/admin`.
- Feedback submission is rate-limited to 1/min client-side.
- Superadmin sees and can resolve/delete each feedback type.

### Phase 7 — MyQuiz + polish
- `/quiz` multi-book, multi-section quiz page (§10.6) with scoped IDs (`${bookId}:${sectionFile}:${itemId}`), cross-book selection persistence, and dedupe.
- Verified-notice daily modal.
- Maintenance mode (`VITE_MAINTENANCE_MODE=true` → short-circuit in `App`).
- Analytics events wired (see §3): `select_book`, `select_section`, `start_flashcards`, `start_quiz`, `toggle_favorite`, `upload_lesson`.
- Vercel Analytics + Speed Insights integration.
- Lazy-load pages via `React.lazy` + `<Suspense fallback={<Spinner />}>`.
- SEO meta + favicon + `logo.svg`/`logo.png`.

**Acceptance:**
- Building a quiz with lessons from 2+ different books produces dedupe'd words with correct counts; switching books mid-selection never clears previously-checked lessons.
- Scoring is correct when two books have a section1/item1 with different `chinese` — no false positives from ID collisions.
- Maintenance mode shows the maintenance page with no auth calls.
- Bundle splits per page (DevTools network tab shows separate chunks).

### Phase 8 — Production hardening
- Full error-boundary around `<App />` with a friendly fallback.
- All Supabase calls wrapped with try/catch + toast-style error surfaces (or inline error cards).
- 404 page `/*`.
- Data validation script: `scripts/validate-data.mjs` that lints every `sectionN.json` (no missing `chinese`/`pinyin`, samples use `en`/`vi`).
- README with dev / deploy / schema instructions.

**Acceptance:**
- `npm run validate:data` passes for all books.
- Intentionally breaking a Supabase query shows an inline error, not a white screen.
- Lighthouse score: performance ≥ 85, accessibility ≥ 90.

---

## 16. Definition of Done (smoke test)

Run through this whole list on a fresh browser session before declaring complete:

### Guest flow
- [ ] Land on `/`, see the nav, a book/section picker, and the review list by default.
- [ ] Switch book → section auto-picks first enabled.
- [ ] Complete a 10-word flashcard deck using only keyboard.
- [ ] Complete a quiz; incorrect answers show in the summary; "Practice wrong" re-runs them.
- [ ] Complete a write mode; parentheses in answers don't cause false negatives.
- [ ] Favorite 5 words → reload tab → favorites survive → start Quiz Favorites.
- [ ] Upload a 15-row XLSX → appears under "User upload".
- [ ] Toggle dark mode, theme (all 3), font size — persists on reload.
- [ ] Visit a teacher's public `/shared/:token` link — can study without logging in.
- [ ] On `/quiz`, check lessons from Book 1 → switch to Book 3 → check more lessons → Book 1 selections are still there → Start → answer a word → scoring is correct (no cross-book ID collisions).

### Member flow
- [ ] Sign in with Google → hash is clean, profile created, role = member.
- [ ] Upload 3 XLSX sets → 4th errors gracefully → extra falls back to localStorage.
- [ ] Complete a quiz → `/dashboard` reflects the new entry within 1 s.
- [ ] Open `/teacher/*` → redirected to `/`.

### Teacher flow
- [ ] Log in as teacher → see `/teacher`.
- [ ] Create book → create section → upload XLSX (dupes skipped) → edit a word via modal.
- [ ] Enable sharing (public) → copy link → open in private window → works.
- [ ] Switch to private + set password → link prompts for password.

### Admin / Superadmin flow
- [ ] Admin: add teacher by UUID → toggle active → teacher's books hide/show.
- [ ] Superadmin: submit feedback from `/feedback` → appears in `/feedback-review` → resolve + delete work.

### Robustness
- [ ] Tab refocus doesn't flicker the UI (no role refetch on `TOKEN_REFRESHED`).
- [ ] Refreshing mid-study restores the same book/section/mode.
- [ ] Clearing localStorage mid-session doesn't crash — app recovers to default book.
- [ ] `is_active = false` via SQL → next request signs the user out.
- [ ] `VITE_MAINTENANCE_MODE=true` shows the maintenance page and makes zero Supabase calls.
- [ ] `npm run build` succeeds; preview loads the same pages.

---

## 17. Deferred (do not build in v1)

- Spaced repetition / review queue
- Teacher ability to assign lessons to specific students
- Student ↔ teacher messaging
- Export/import of entire progress (GDPR request support)
- Per-word feedback UI on student side (button exists in WordListView as commented code; unhide later)
- OAuth providers beyond Google
- Email notifications for feedback resolution
