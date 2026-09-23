import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pollService } from '../pollService';
import type { CreatePollPayload, UpdatePollPayload } from '../../../types';

export const useSaveVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pollId,
      studentId,
      optionIds
    }: {
      pollId: string;
      studentId: string;
      optionIds: string[];
    }) => pollService.saveStudentVote(pollId, studentId, optionIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      queryClient.invalidateQueries({ queryKey: ['pollDetail', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['pollAnalytics', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
    },
  });
};

export const useSubmitVote = useSaveVote;

export const useCreatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, adminId }: { payload: CreatePollPayload; adminId: string }) =>
      pollService.createPoll(payload, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
    },
  });
};

export const useUpdatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, adminId }: { payload: UpdatePollPayload; adminId?: string }) =>
      pollService.updatePoll(payload, adminId),
    onSuccess: (updatedPoll) => {
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      queryClient.invalidateQueries({ queryKey: ['pollDetail', updatedPoll.id] });
      queryClient.invalidateQueries({ queryKey: ['pollAnalytics', updatedPoll.id] });
    },
  });
};

export const useDeletePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => pollService.deletePoll(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
    },
  });
};

export const useSetPollPriority = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pollId,
      isPriority,
      duration = '24_hours',
      customExpiresAt
    }: {
      pollId: string;
      isPriority: boolean;
      duration?: '24_hours' | '3_days' | '7_days' | 'custom' | 'manual';
      customExpiresAt?: string | null;
    }) => pollService.setPriority(pollId, isPriority, duration, customExpiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
    },
  });
};

export const useSendPollReminder = () => {
  return useMutation({
    mutationFn: (pollId: string) => pollService.sendPollReminder(pollId),
  });
};

