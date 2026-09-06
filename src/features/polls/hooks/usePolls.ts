import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pollService } from '../pollService';
import { supabase } from '../../../lib/supabase';
import type { PollWithDetails, UserProfile } from '../../../types';

export const useStudentPolls = (studentProfile: UserProfile | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!studentProfile?.id) return;

    const channel = supabase
      .channel(`public:student_polls_${studentProfile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => {
        queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_options' }, () => {
        queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_responses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_response_options' }, () => {
        queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentProfile?.id, queryClient]);

  return useQuery<PollWithDetails[], Error>({
    queryKey: ['studentPolls', studentProfile?.id],
    queryFn: () => {
      if (!studentProfile?.id) return Promise.resolve([]);
      return pollService.getStudentPolls(studentProfile.id);
    },
    enabled: !!studentProfile?.id && studentProfile?.role === 'student',
    staleTime: 1000 * 10,
  });
};

export const useAdminPolls = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('public:admin_polls_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_responses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery<PollWithDetails[], Error>({
    queryKey: ['adminPolls'],
    queryFn: () => pollService.getAllPolls(),
    staleTime: 1000 * 10,
  });
};
