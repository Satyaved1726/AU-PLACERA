import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '../postService';

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => postService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
};
export default useDeletePost;
