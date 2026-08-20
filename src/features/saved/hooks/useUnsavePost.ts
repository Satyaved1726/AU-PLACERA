import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savedPostsService } from '../savedPostsService';

interface UnsavePostParams {
  postId: string;
  studentId: string;
}

export const useUnsavePost = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UnsavePostParams>({
    mutationFn: ({ postId, studentId }) => savedPostsService.unsavePost(postId, studentId),
    onSuccess: (_, variables) => {
      const { studentId, postId } = variables;
      queryClient.invalidateQueries({ queryKey: ['savedPosts', studentId] });
      queryClient.invalidateQueries({ queryKey: ['isSaved', studentId, postId] });
    }
  });
};
export default useUnsavePost;
