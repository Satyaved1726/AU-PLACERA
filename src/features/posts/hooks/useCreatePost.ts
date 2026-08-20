import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '../postService';
import type { Post } from '../../../types';

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation<Post[], Error, Omit<Post, 'id' | 'created_at' | 'updated_at'>[]>({
    mutationFn: (posts) => postService.createPosts(posts),
    onSuccess: () => {
      // Invalidate posts cache to trigger re-fetches across notice boards
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
};
export default useCreatePost;
