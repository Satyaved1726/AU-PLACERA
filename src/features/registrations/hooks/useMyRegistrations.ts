import { useQuery } from '@tanstack/react-query';
import { registrationsService } from '../registrationsService';
import type { Registration } from '../../../types';

export const useMyRegistrations = (studentId?: string) => {
  return useQuery<Registration[], Error>({
    queryKey: ['myRegistrations', studentId],
    queryFn: () => {
      if (!studentId) return Promise.resolve([]);
      return registrationsService.getMyRegistrations(studentId);
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default useMyRegistrations;
