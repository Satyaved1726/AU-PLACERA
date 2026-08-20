import { useQuery } from '@tanstack/react-query';
import { postService } from '../postService';
import type { Post } from '../../../types';

export const usePosts = () => {
  return useQuery<Post[], Error>({
    queryKey: ['posts', 'active'],
    queryFn: () => postService.getActivePosts(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default usePosts;
