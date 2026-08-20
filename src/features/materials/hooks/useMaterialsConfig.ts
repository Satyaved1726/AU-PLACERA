import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsService } from '../materialsService';
import type { MaterialsConfig } from '../../../types';

export const useMaterialsConfig = () => {
  return useQuery<MaterialsConfig | null, Error>({
    queryKey: ['materials-config'],
    queryFn: () => materialsService.getMaterialsConfig()
  });
};

export const useUpdateMaterialsConfig = () => {
  const queryClient = useQueryClient();

  return useMutation<
    MaterialsConfig,
    Error,
    { id: string; drive_url: string; title: string; description?: string }
  >({
    mutationFn: ({ id, ...params }) => materialsService.updateMaterialsConfig(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-config'] });
    }
  });
};
