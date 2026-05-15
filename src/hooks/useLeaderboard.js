import { useQuery } from '@tanstack/react-query';
import { loadLeaderboard, loadMyRank } from '@/lib/supabase';

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: loadLeaderboard,
    staleTime: 0,
  });
}

export function useMyRank({ enabled = false } = {}) {
  return useQuery({
    queryKey: ['myRank'],
    queryFn: loadMyRank,
    enabled,
    staleTime: 0,
  });
}
