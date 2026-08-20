import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savedPostsService } from '../savedPostsService';
import type { SavedPost } from '../../../types';

interface SavePostParams {
  postId: string;
  studentId: string;
}

export const useSavePost = () => {
  const queryClient = useQueryClient();

  return useMutation<SavedPost, Error, SavePostParams>({
    mutationFn: ({ postId, studentId }) => savedPostsService.savePost(postId, studentId),
    onSuccess: (_, variables) => {
      const { studentId, postId } = variables;
      queryClient.invalidateQueries({ queryKey: ['savedPosts', studentId] });
      queryClient.invalidateQueries({ queryKey: ['isSaved', studentId, postId] });
    }
  });
};
export default useSavePost;
