import { useQuery } from '@tanstack/react-query';
import { pollService } from '../pollService';
import type { PollWithDetails } from '../../../types';

export const usePollDetail = (pollId: string, studentId?: string) => {
  return useQuery<PollWithDetails, Error>({
    queryKey: ['pollDetail', pollId, studentId],
    queryFn: () => pollService.getPollById(pollId, studentId),
    enabled: !!pollId,
    staleTime: 1000 * 30,
  });
};
