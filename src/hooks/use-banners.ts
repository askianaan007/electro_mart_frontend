import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';

export const bannerKeys = {
  all: ['banners'] as const,
  lists: () => [...bannerKeys.all, 'list'] as const,
  detail: (id: string) => [...bannerKeys.all, 'detail', id] as const,
  assignments: (id: string) => [...bannerKeys.detail(id), 'assignments'] as const,
};

export function useBanners() {
  return useQuery({
    queryKey: bannerKeys.lists(),
    queryFn: () => api.banners.list(),
  });
}

export function useBanner(id: string | undefined) {
  return useQuery({
    queryKey: bannerKeys.detail(id ?? ''),
    queryFn: () => api.banners.get(id as string),
    enabled: !!id,
  });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: Record<string, unknown>; image: File }) => api.banners.create(vars.data, vars.image),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.lists() }),
  });
}

export function useUpdateBanner(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.banners.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bannerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bannerKeys.detail(id) });
    },
  });
}

export function useSetBannerStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: 'ACTIVE' | 'INACTIVE') => api.banners.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.lists() }),
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.banners.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.lists() }),
  });
}

export function useBannerAssignments(id: string) {
  return useQuery({
    queryKey: bannerKeys.assignments(id),
    queryFn: () => api.banners.listAssignments(id),
    enabled: !!id,
  });
}

export function useAssignBanner(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { representativeId: string; priority?: number; startsAt?: string; expiresAt?: string }) =>
      api.banners.assign(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.assignments(id) }),
  });
}

export function useRemoveBannerAssignment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => api.banners.removeAssignment(id, assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.assignments(id) }),
  });
}
