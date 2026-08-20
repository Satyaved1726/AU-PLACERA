import { useQuery } from '@tanstack/react-query';
import { registrationsService } from '../registrationsService';
import type { Registration } from '../../../types';

export const useRegistrations = (postId?: string) => {
  return useQuery<Registration[], Error>({
    queryKey: ['adminRegistrations', postId],
    queryFn: () => {
      if (!postId) return Promise.resolve([]);
      return registrationsService.getRegistrationsByPost(postId);
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
};
export default useRegistrations;
