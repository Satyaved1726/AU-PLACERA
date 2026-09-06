import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pollService } from '../pollService';
import { supabase } from '../../../lib/supabase';
import type { PollAnalyticsSummary } from '../../../types';

export const usePollAnalytics = (pollId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pollId) return;

    const channel = supabase
      .channel(`public:poll_analytics_${pollId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_responses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pollAnalytics', pollId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_response_options' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pollAnalytics', pollId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, queryClient]);

  return useQuery<PollAnalyticsSummary, Error>({
    queryKey: ['pollAnalytics', pollId],
    queryFn: () => pollService.getPollAnalytics(pollId),
    enabled: !!pollId,
    staleTime: 1000 * 10,
  });
};
