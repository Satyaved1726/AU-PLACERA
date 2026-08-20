import { useQuery } from '@tanstack/react-query';
import { savedPostsService } from '../savedPostsService';

export const useIsSaved = (studentId?: string, postId?: string) => {
  return useQuery<boolean, Error>({
    queryKey: ['isSaved', studentId, postId],
    queryFn: async () => {
      if (!studentId || !postId) return false;
      const list = await savedPostsService.getSavedPosts(studentId);
      return list.some(p => p.id === postId);
    },
    enabled: !!studentId && !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default useIsSaved;
