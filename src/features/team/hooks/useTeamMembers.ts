import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../teamService';
import type { TeamMember } from '../../../types';

export const useTeamMembers = () => {
  return useQuery<TeamMember[], Error>({
    queryKey: ['team-members'],
    queryFn: () => teamService.getTeamMembers()
  });
};

export const useCreateTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation<
    TeamMember,
    Error,
    {
      fullName: string;
      designation: string;
      category: 'leadership' | 'ssra';
      department?: string | null;
      description?: string | null;
      photoFile: File;
      linkedinUrl?: string | null;
      githubUrl?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    }
  >({
    mutationFn: (params) => teamService.createTeamMember(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });
};

export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation<
    TeamMember,
    Error,
    {
      id: string;
      params: {
        fullName: string;
        designation: string;
        category: 'leadership' | 'ssra';
        department?: string | null;
        description?: string | null;
        linkedinUrl?: string | null;
        githubUrl?: string | null;
        displayOrder?: number;
        isActive?: boolean;
        newPhotoFile?: File | null;
        oldPhotoUrl?: string;
      };
    }
  >({
    mutationFn: ({ id, params }) => teamService.updateTeamMember(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });
};

export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; photoUrl: string }
  >({
    mutationFn: ({ id, photoUrl }) => teamService.deleteTeamMember(id, photoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });
};

export const useToggleMemberActive = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; isActive: boolean }
  >({
    mutationFn: ({ id, isActive }) => teamService.toggleMemberActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });
};

export const useUpdateDisplayOrder = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; displayOrder: number }
  >({
    mutationFn: ({ id, displayOrder }) => teamService.updateDisplayOrder(id, displayOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });
};
