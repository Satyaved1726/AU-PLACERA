import { useQuery } from '@tanstack/react-query';
import { savedPostsService } from '../savedPostsService';
import type { Post } from '../../../types';

export const useSavedPosts = (studentId?: string) => {
  return useQuery<Post[], Error>({
    queryKey: ['savedPosts', studentId],
    queryFn: () => {
      if (!studentId) return Promise.resolve([]);
      return savedPostsService.getSavedPosts(studentId);
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default useSavedPosts;
