import { useQuery } from '@tanstack/react-query';
import { authService } from '../authService';
import type { UserProfile } from '../../../types';

export const useStudents = () => {
  return useQuery<UserProfile[], Error>({
    queryKey: ['students'],
    queryFn: () => authService.getAllStudents(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
export default useStudents;
