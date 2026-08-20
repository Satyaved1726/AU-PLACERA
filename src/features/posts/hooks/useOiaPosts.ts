import { useQuery } from '@tanstack/react-query';
import { postService } from '../postService';
import type { Post } from '../../../types';

export const useOiaPosts = () => {
  return useQuery<Post[], Error>({
    queryKey: ['posts', 'oia'],
    queryFn: () => postService.getOiaPosts(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default useOiaPosts;
