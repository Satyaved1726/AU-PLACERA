import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../authService';
import type { UserProfile } from '../../../types';

interface UpdateStudentOiaParams {
  studentId: string;
  oiaEligible: boolean;
}

export const useUpdateStudentOia = () => {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, UpdateStudentOiaParams>({
    mutationFn: ({ studentId, oiaEligible }) => authService.updateStudentOia(studentId, oiaEligible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });
};
export default useUpdateStudentOia;
