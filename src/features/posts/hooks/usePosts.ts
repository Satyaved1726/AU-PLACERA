import { useQuery } from '@tanstack/react-query';
import { postService } from '../postService';
import { useAuth } from '../../auth/useAuth';
import type { Post } from '../../../types';

export const usePosts = () => {
  const { profile } = useAuth();
  const oiaEligible = profile?.oia_eligible || false;

  return useQuery<Post[], Error>({
    queryKey: ['posts', 'active', oiaEligible],
    queryFn: () => postService.getActivePosts(oiaEligible),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default usePosts;
