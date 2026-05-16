import { useOutletContext } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useLeaderboard, useMyRank } from '@/hooks/useLeaderboard';
import { useAuthStore } from '@/store/authStore';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const PODIUM_STYLE = {
  1: {
    pedestal: 'h-32 bg-gradient-to-b from-yellow-200 to-yellow-50 dark:from-yellow-700/50 dark:to-yellow-900/20 border-yellow-400/70 dark:border-yellow-600/50',
    ring:     'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background',
  },
  2: {
    pedestal: 'h-24 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-600/40 dark:to-slate-700/20 border-slate-400/50 dark:border-slate-500/40',
    ring:     'ring-2 ring-slate-400 ring-offset-1 ring-offset-background',
  },
  3: {
    pedestal: 'h-16 bg-gradient-to-b from-amber-300/80 to-amber-100 dark:from-amber-700/40 dark:to-amber-900/20 border-amber-500/50 dark:border-amber-600/40',
    ring:     'ring-2 ring-amber-500 ring-offset-1 ring-offset-background',
  },
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 animate-pulse">
      <div className="h-4 w-6 rounded bg-muted shrink-0" />
      <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
      <div className="h-4 flex-1 rounded bg-muted" />
      <div className="h-5 w-12 rounded-full bg-muted" />
    </div>
  );
}

function UserAvatar({ u, size = 'md', ring = '' }) {
  const cls =
    size === 'lg' ? 'h-16 w-16 text-xl' :
    size === 'md' ? 'h-12 w-12 text-base' :
                    'h-7 w-7 text-xs';
  if (u.avatar_url) {
    return <img src={u.avatar_url} alt="" referrerPolicy="no-referrer" className={`rounded-full object-cover shrink-0 ${cls} ${ring}`} />;
  }
  return (
    <div className={`rounded-full bg-muted flex items-center justify-center font-bold shrink-0 ${cls} ${ring}`}>
      {u.username?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function PodiumSlot({ u, rank, streakVal, isMe, t }) {
  const isFirst = rank === 1;
  const style = PODIUM_STYLE[rank];

  return (
    <div className="flex flex-col items-center gap-1.5 w-[96px] sm:w-[128px]">
      <div className="relative">
        <UserAvatar u={u} size={isFirst ? 'lg' : 'md'} ring={style.ring} />
        {isMe && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-background" />
        )}
      </div>
      <p className={`font-bold text-center leading-tight w-full px-1 break-words line-clamp-2 ${isFirst ? 'text-sm' : 'text-xs'}`}>
        {u.username}
      </p>
      {isMe && (
        <span className="text-[10px] text-primary font-semibold -mt-1">({t?.leaderboardYou})</span>
      )}
      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
        🔥 {streakVal}
      </span>
      <div className={`w-full ${style.pedestal} border-t-2 rounded-t-xl flex items-center justify-center`}>
        <span className={isFirst ? 'text-4xl' : 'text-2xl'}>
          {MEDAL[rank]}
        </span>
      </div>
    </div>
  );
}

function RankRow({ u, rank, streakVal, isMe, t }) {
  const medal = MEDAL[rank];
  return (
    <div className={[
      'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
      isMe && rank > 3 ? 'border-primary bg-primary/5' : '',
      rank === 1 ? 'border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 dark:from-yellow-800/40 dark:via-amber-900/20 dark:to-yellow-800/40 shadow-md shadow-yellow-200 dark:shadow-yellow-900/40' : '',
      rank === 2 ? 'border-2 border-sky-400 dark:border-sky-500 bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 dark:from-sky-800/40 dark:via-blue-900/20 dark:to-sky-800/40 shadow-md shadow-sky-200 dark:shadow-sky-900/40' : '',
      rank === 3 ? 'border-2 border-amber-500 dark:border-amber-600 bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 dark:from-amber-800/40 dark:via-orange-900/20 dark:to-amber-800/40 shadow-md shadow-amber-200 dark:shadow-amber-900/40' : '',
      rank > 3 && !isMe ? 'border-border' : '',
      rank > 3 && !isMe && rank <= 10 ? 'border-l-2 border-l-amber-300 dark:border-l-amber-700' : '',
    ].filter(Boolean).join(' ')}>
      <span className={`shrink-0 w-6 text-center font-bold ${medal ? 'text-xl' : 'text-sm text-muted-foreground'}`}>
        {medal ?? rank}
      </span>
      <UserAvatar u={u} size="sm" />
      <span className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
        <span className={`font-semibold truncate ${rank <= 3 ? 'text-base' : 'text-sm'}`}>{u.username}</span>
        {isMe && <span className="shrink-0 text-xs font-normal text-primary">({t?.leaderboardYou})</span>}
      </span>
      <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
        🔥 {streakVal}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const { t } = useOutletContext() ?? {};
  const { user } = useAuthStore();

  const { data = [], isLoading, error } = useLeaderboard();
  const { data: myRank } = useMyRank({ enabled: !!user });

  const rows = [...data].filter(u => u.current_streak > 0).sort((a, b) => b.current_streak - a.current_streak);

  const myStreakVal = myRank?.current_streak ?? null;
  const myRankVal  = myRank?.current_rank ?? null;
  const showSticky = myRank && myRankVal > 3;

  const [p1, p2, p3] = [rows[0], rows[1], rows[2]];

  return (
    <>
      <div className={`min-h-screen bg-background px-4 py-6 text-foreground ${showSticky ? 'pb-24' : ''}`}>
        <div className="mx-auto max-w-2xl flex flex-col gap-6">

          {/* Header */}
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            {t?.leaderboardSubtitle}
          </h1>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <p className="text-sm text-rose-500">{t?.leaderboardError}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t?.leaderboardEmpty}</p>
          ) : (
            <div className="flex flex-col gap-4">

              {/* Podium stage — desktop only */}
              {p1 && (
                <div className="hidden sm:block rounded-2xl bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-950/20 dark:to-transparent px-4 pt-6 pb-4 overflow-hidden">
                  <div className="flex items-end justify-center gap-6 sm:gap-12">
                    {p2 && <PodiumSlot u={p2} rank={2} streakVal={p2.current_streak} isMe={myRank?.username === p2.username} t={t} />}
                    <PodiumSlot u={p1} rank={1} streakVal={p1.current_streak} isMe={myRank?.username === p1.username} t={t} />
                    {p3 && <PodiumSlot u={p3} rank={3} streakVal={p3.current_streak} isMe={myRank?.username === p3.username} t={t} />}
                  </div>
                </div>
              )}

              {/* Full list — mobile shows all 20, desktop shows from rank 4 */}
              <div className="flex flex-col gap-2">
                {rows.slice(0, 20).map((u, idx) => {
                  const rank = idx + 1;
                  if (rank <= 3) {
                    return (
                      <div key={u.username} className="sm:hidden">
                        <RankRow u={u} rank={rank} streakVal={u.current_streak} isMe={myRank?.username === u.username} t={t} />
                      </div>
                    );
                  }
                  return (
                    <RankRow key={u.username} u={u} rank={rank} streakVal={u.current_streak} isMe={myRank?.username === u.username} t={t} />
                  );
                })}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Sticky my rank bar */}
      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <RankRow
              u={{ username: myRank.username, avatar_url: user?.user_metadata?.avatar_url ?? null }}
              rank={myRankVal}
              streakVal={myStreakVal}
              isMe
              t={t}
            />
          </div>
        </div>
      )}
    </>
  );
}
