import { useQuery } from '@tanstack/react-query';
import { pollService } from '../pollService';
import type { PollWithDetails, UserProfile } from '../../../types';

export const useStudentPolls = (studentProfile: UserProfile | null) => {
  return useQuery<PollWithDetails[], Error>({
    queryKey: ['studentPolls', studentProfile?.id],
    queryFn: () => {
      if (!studentProfile?.id) return Promise.resolve([]);
      return pollService.getStudentPolls(studentProfile.id);
    },
    enabled: !!studentProfile?.id && studentProfile?.role === 'student',
    staleTime: 1000 * 30,
  });
};

export const useAdminPolls = () => {
  return useQuery<PollWithDetails[], Error>({
    queryKey: ['adminPolls'],
    queryFn: () => pollService.getAllPolls(),
    staleTime: 1000 * 30, // 30 seconds
  });
};
