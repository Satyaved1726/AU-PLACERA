import { useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsService } from '../announcementsService';

interface DeleteAnnouncementParams {
  id: string;
  imageUrl: string;
}

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteAnnouncementParams>({
    mutationFn: ({ id, imageUrl }) => announcementsService.deleteAnnouncement(id, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });
};

export default useDeleteAnnouncement;
