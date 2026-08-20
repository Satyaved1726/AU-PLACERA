import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationsService } from '../registrationsService';
import type { Registration } from '../../../types';

interface RegisterParams {
  postId: string;
  studentId: string;
}

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation<Registration, Error, RegisterParams>({
    mutationFn: ({ postId, studentId }) => registrationsService.registerForPost(postId, studentId),
    onSuccess: (_, variables) => {
      const { studentId, postId } = variables;
      // Invalidate queries to refresh counts and button states
      queryClient.invalidateQueries({ queryKey: ['myRegistrations', studentId] });
      queryClient.invalidateQueries({ queryKey: ['isRegistered', studentId, postId] });
      queryClient.invalidateQueries({ queryKey: ['adminRegistrations', postId] });
      queryClient.invalidateQueries({ queryKey: ['adminPosts'] });
    }
  });
};
export default useRegister;
