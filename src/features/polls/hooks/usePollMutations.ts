import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pollService } from '../pollService';
import type { CreatePollPayload, UpdatePollPayload } from '../../../types';

export const useSubmitVote = () => {
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
    }) => pollService.submitVote(pollId, studentId, optionIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      queryClient.invalidateQueries({ queryKey: ['pollDetail', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['pollAnalytics', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
    },
  });
};

export const useUpdateVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      responseId,
      optionIds
    }: {
      responseId: string;
      optionIds: string[];
      pollId: string;
    }) => pollService.updateVote(responseId, optionIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      queryClient.invalidateQueries({ queryKey: ['pollDetail', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['pollAnalytics', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
    },
  });
};

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
    mutationFn: ({ pollId, payload }: { pollId: string; payload: Partial<UpdatePollPayload> }) =>
      pollService.updatePoll(pollId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      queryClient.invalidateQueries({ queryKey: ['pollDetail', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['pollAnalytics', variables.pollId] });
    },
  });
};

export const useClosePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => pollService.closePoll(pollId),
    onSuccess: (_, pollId) => {
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
      queryClient.invalidateQueries({ queryKey: ['pollDetail', pollId] });
      queryClient.invalidateQueries({ queryKey: ['pollAnalytics', pollId] });
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
