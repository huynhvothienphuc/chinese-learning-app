import { useQuery } from '@tanstack/react-query';
import { loadLeaderboard, loadMyRank } from '@/lib/supabase';

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: loadLeaderboard,
    staleTime: 1000 * 60 * 10,
  });
}

export function useMyRank({ enabled = false } = {}) {
  return useQuery({
    queryKey: ['myRank'],
    queryFn: loadMyRank,
    enabled,
    staleTime: 1000 * 60 * 10,
  });
}
