import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '../postService';

interface SetPostPriorityParams {
  id: string;
  isPriority: boolean;
  duration?: '24_hours' | '3_days' | '7_days' | 'custom' | 'manual';
  customExpiresAt?: string | null;
}

export const useSetPostPriority = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SetPostPriorityParams>({
    mutationFn: ({ id, isPriority, duration = '24_hours', customExpiresAt }) =>
      postService.setPriority(id, isPriority, duration, customExpiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
};

export default useSetPostPriority;
