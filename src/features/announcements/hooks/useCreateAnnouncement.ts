import { useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsService } from '../announcementsService';
import type { DigitalAnnouncement } from '../../../types';

interface CreateAnnouncementParams {
  title: string;
  description?: string;
  imageFile: File;
  externalUrl?: string | null;
  isOia: boolean;
  createdBy: string;
}

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation<DigitalAnnouncement, Error, CreateAnnouncementParams>({
    mutationFn: (params) => announcementsService.createAnnouncement(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });
};

export default useCreateAnnouncement;
