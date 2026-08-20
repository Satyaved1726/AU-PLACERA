import { useQuery } from '@tanstack/react-query';
import { registrationsService } from '../registrationsService';

export const useIsRegistered = (studentId?: string, postId?: string) => {
  return useQuery<boolean, Error>({
    queryKey: ['isRegistered', studentId, postId],
    queryFn: async () => {
      if (!studentId || !postId) return false;
      const list = await registrationsService.getMyRegistrations(studentId);
      return list.some(r => r.post_id === postId);
    },
    enabled: !!studentId && !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default useIsRegistered;
