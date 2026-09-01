# Streak Logic

## Source of truth
- DB (`profiles.current_streak`, `profiles.last_streak_date`) is authoritative for members.
- `localStorage['study-streak']` is a **display cache only**, synced from DB on mount (`src/hooks/useStreak.js`). It exists so the UI has something to show before the DB round-trip resolves, and so a cleared cache / new device self-heals from DB.
- Guests get a local-only calculation (no DB row to validate against).

## Core hook: `src/hooks/useStreak.js`
`useStreak({ userId, isMember })` returns `{ streak, trackFlip, triggerStreak, resetCardTracking, toast, dismissToast }`.

- `triggeredToday` (ref) — guards against firing more than once per day. Initialized from localStorage on mount, and re-synced from the DB's `last_streak_date` once the DB profile loads.
- `triggerStreak()` — the actual increment call. For members, calls the `updateStreak(userId)` RPC (DB computes increment/reset/no-op, source of truth). For guests, does local arithmetic (yesterday → +1, otherwise reset to 1). Fires the `streak-updated` `CustomEvent` on `window` so every mounted `useStreak` instance (e.g. Navbar + page) stays in sync.
- `trackFlip(cardId)` — flashcard-specific helper. Tracks unique card IDs in a `Set`; once 10 unique cards are seen, calls `triggerStreak()` itself.

## Trigger points (as of 2026-07-28)

| Action | Where | Trigger |
|---|---|---|
| Flashcard flips | `LearnPage.jsx` — `trackFlip(session.currentItem?.id)` on flip | Auto-fires `triggerStreak()` at 10 unique cards |
| Quiz ("kiểm tra"), Learn page | `LearnPage.jsx:110` — `onQuizComplete` callback passed into `useStudySession` | `triggerStreak()` called directly on completion |
| Write ("viết"), Learn page | `WriteMode`'s `onPracticeThreshold` prop | `triggerStreak()` called once 10 unique words have been **submitted** (right or wrong doesn't matter) — does not require finishing the whole set |
| Quiz, My Quiz page | `MyQuizPage.jsx` — `handleNextQuestion()`, when the last question is answered | `triggerStreak()` — **added 2026-07-28**, was previously missing |
| Write, My Quiz page | `WriteMode`'s `onPracticeThreshold` prop | Same 10-word-submitted rule as above — **added 2026-07-28**, was previously missing |
| Review mode ("word list"), Learn page | `LearnPage.jsx:334` — `WordListView` | No trigger — intentional, there's no "completion" event for a passive list view |

## Write mode's trigger rule (changed 2026-07-28)
Write mode is treated as practice, not a graded test — so streak credit is based on effort, not results or completion:
- `WriteMode.jsx` tracks unique submitted word IDs in a local `Set` (`practicedIdsRef`), incremented in `handleSubmit` regardless of correct/incorrect.
- Once the set reaches 10, `onPracticeThreshold()` fires exactly once per `WriteMode` mount (guarded by `thresholdFiredRef`).
- This mirrors Flashcard mode's "10 unique flips" rule (`useStreak.trackFlip`) — same 10-item threshold, same "doesn't need to reach the end of the set" behavior, same limitation: **a section/selection with fewer than 10 words can never trigger streak via Write mode**, even if fully completed. No completion-based fallback exists by design (matches Flashcard mode's existing behavior; consistency was chosen over covering short sections).
- The old behavior — `triggerStreak()` firing on full-session completion (`onComplete`) — was removed. `onComplete` is still used, but only for its original purpose on the Learn page: recording `trackLessonStat` when a full lesson write session finishes.

## The bug fixed this session
`MyQuizPage.jsx` (the standalone "My Quiz" feature, separate from the in-lesson Learn page quiz/write) never called `triggerStreak()` at all — no `useStreak` import, no RPC call, nothing. `WriteMode` was rendered without any completion/practice callback, and the multiple-choice `Quiz` completion path had no streak wiring either. Silent failure: no error, just no streak credit. Fixed by wiring `useStreak` into `MyQuizPage.jsx` and adding `<StreakToast>` for UI parity with the Learn page.

## Known limitations / ideas for next time
- **Client-supplied date**: `p_today` for the streak RPC is derived from the browser's local clock. A user changing their system clock could game the streak. Accepted trade-off given the app's scale — revisit if abuse is ever reported.
- **Leaderboard filter dependency**: `get_leaderboard` / `get_my_rank` (Supabase RPCs) filter on `last_streak_date >= current_date - 1 day` to hide expired streaks — if the streak-trigger logic here ever changes what counts as "today", double check those RPCs stay consistent (`supabase-setup.sql`).
- **No dedup across concurrent tabs**: if a user has the Learn page and My Quiz page open in two tabs and completes an action in each within the same window before either write finishes, both could attempt `updateStreak` — not harmful (DB should no-op the second call) but worth confirming the RPC is idempotent under concurrent calls, not just sequential ones.
- **Any future practice mode** (new quiz type, new game, etc.) needs to explicitly wire `triggerStreak()` — there's no central "action completed" event bus, so this is easy to forget again (as happened with My Quiz page). Consider a lint rule, a checklist, or a shared "on lesson-action complete" wrapper if a third instance of this bug shows up.
