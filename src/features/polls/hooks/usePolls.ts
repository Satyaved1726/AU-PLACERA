import { useQuery } from '@tanstack/react-query';
import { pollService } from '../pollService';
import type { PollWithDetails, UserProfile } from '../../../types';

export const useStudentPolls = (studentProfile: UserProfile | null) => {
  return useQuery<PollWithDetails[], Error>({
    queryKey: ['studentPolls', studentProfile?.id, studentProfile?.section],
    queryFn: () => {
      if (!studentProfile) return Promise.resolve([]);
      return pollService.getStudentPolls(studentProfile);
    },
    enabled: !!studentProfile?.id && studentProfile?.role === 'student',
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useAdminPolls = () => {
  return useQuery<PollWithDetails[], Error>({
    queryKey: ['adminPolls'],
    queryFn: () => pollService.getAllPolls(),
    staleTime: 1000 * 30, // 30 seconds
  });
};
