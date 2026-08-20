import { useQuery } from '@tanstack/react-query';
import { postService } from '../postService';
import type { Post } from '../../../types';

export const useAdminPosts = () => {
  return useQuery<Post[], Error>({
    queryKey: ['posts', 'admin'],
    queryFn: () => postService.getAdminPosts(),
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
};
export default useAdminPosts;
