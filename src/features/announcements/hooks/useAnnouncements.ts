import { useQuery } from '@tanstack/react-query';
import { announcementsService } from '../announcementsService';
import type { DigitalAnnouncement } from '../../../types';

export const useAnnouncements = () => {
  return useQuery<DigitalAnnouncement[], Error>({
    queryKey: ['announcements'],
    queryFn: () => announcementsService.getAnnouncements(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

export default useAnnouncements;
