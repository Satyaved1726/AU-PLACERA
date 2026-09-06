import { useQuery } from '@tanstack/react-query';
import { pollService } from '../pollService';
import type { PollAnalyticsSummary } from '../../../types';

export const usePollAnalytics = (pollId: string) => {
  return useQuery<PollAnalyticsSummary, Error>({
    queryKey: ['pollAnalytics', pollId],
    queryFn: () => pollService.getPollAnalytics(pollId),
    enabled: !!pollId,
    staleTime: 1000 * 30, // 30 seconds
  });
};
