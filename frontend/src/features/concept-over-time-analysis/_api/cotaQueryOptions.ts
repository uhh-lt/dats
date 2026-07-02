import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import { ConceptOverTimeAnalysisService } from "@api/services/ConceptOverTimeAnalysisService";
import { COTARead } from "@models/COTARead";
import { COTARefinementJobRead } from "@models/COTARefinementJobRead";
import { JobStatus } from "@models/JobStatus";
import { useAppSelector } from "@store/storeHooks";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

export type CotaMap = Record<number, COTARead>;

export const projectCotasQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_COTAS, projectId],
    queryFn: async () => {
      const data = await ConceptOverTimeAnalysisService.getByProject({ projectId });
      return data.reduce((acc, cota) => {
        acc[cota.id] = cota;
        return acc;
      }, {} as CotaMap);
    },
    staleTime: 1000 * 60 * 5,
  });

export const useCreateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.create,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Created new Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useDuplicateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.duplicateById,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Duplicated Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useUpdateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.updateById,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Updated Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useAnnotateCotaSentences = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.annotateCotaSentence,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Updated annotations in Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useRemoveCotaSentences = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.removeCotaSentence,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Removed sentences from Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useResetCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.resetCota,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Reset Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useDeleteCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.deleteById,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[cota.id];
        return next;
      });
    },
    meta: {
      successMessage: (cota: COTARead) => `Deleted Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const usePollCOTARefinementJob = (cotaRefinementJobId: string | null) =>
  useQuery<COTARefinementJobRead | null, Error>({
    queryKey: [QueryKey.COTA_REFINEMENT_JOB, cotaRefinementJobId],
    queryFn: () =>
      ConceptOverTimeAnalysisService.getCotaJob({
        cotaJobId: cotaRefinementJobId!,
      }),
    enabled: !!cotaRefinementJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }

      switch (query.state.data.status) {
        case JobStatus.CANCELED:
        case JobStatus.FAILED:
        case JobStatus.FINISHED:
        case JobStatus.STOPPED:
          return false;
        case JobStatus.DEFERRED:
        case JobStatus.QUEUED:
        case JobStatus.SCHEDULED:
        case JobStatus.STARTED:
          return 1000;
        default:
          return false;
      }
    },
  });

export const useRefineCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.refineCota,
    onSuccess(cota) {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Started refinement job for "COTA ${cota.id}"`,
    },
  });

/**
 * Convenience hook for components that need a single COTA by ID but have no route context.
 * For route-backed components, use useSuspenseQuery with projectCotasQueryOptions directly.
 */
export const useGetCotaById = (cotaId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...projectCotasQueryOptions(projectId!),
    select: (data) => (cotaId != null ? data[cotaId] : undefined),
    enabled: !!projectId && cotaId != null,
  });
};

export const useGetProjectCotaList = () => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...projectCotasQueryOptions(projectId!),
    select: (data) => Object.values(data),
    enabled: !!projectId,
  });
};
