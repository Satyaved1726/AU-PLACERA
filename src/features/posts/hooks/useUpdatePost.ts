import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '../postService';
import type { Post } from '../../../types';

interface UpdatePostParams {
  id: string;
  updates: Partial<Omit<Post, 'id' | 'created_at' | 'updated_at'>>;
}

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation<Post, Error, UpdatePostParams>({
    mutationFn: ({ id, updates }) => postService.updatePost(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
};
export default useUpdatePost;
