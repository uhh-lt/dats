import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { COTARead } from "./openapi/models/COTARead.ts";
import { COTARefinementJobRead } from "./openapi/models/COTARefinementJobRead.ts";
import { ConceptOverTimeAnalysisService } from "./openapi/services/ConceptOverTimeAnalysisService.ts";

// COTA QUERIES

export type CotaMap = Record<number, COTARead>;

interface UseCotaQueryParams<T> {
  select?: (data: CotaMap) => T;
  enabled?: boolean;
}

const useCotasQuery = <T = CotaMap>({ select, enabled }: UseCotaQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_COTAS, projectId],
    queryFn: async () => {
      const data = await ConceptOverTimeAnalysisService.getByProject({ projectId: projectId! });
      return data.reduce((acc, cota) => {
        acc[cota.id] = cota;
        return acc;
      }, {} as CotaMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetCota = (cotaId: number | null | undefined) =>
  useCotasQuery({
    select: (data) => data[cotaId!],
    enabled: !!cotaId,
  });

const useGetProjectCotaList = () => useCotasQuery({ select: (data) => Object.values(data) });

// COTA MUTATIONS

// create mutations
const useCreateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.create,
    onSuccess: (cota) => {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Created new Concept Over Time Analysis "${cota.name}"`,
    },
  });

const useDuplicateCota = () =>
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

// update mutations
const useUpdateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.updateById,
    onSuccess: (cota) => {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Updated Concept Over Time Analysis "${cota.name}"`,
    },
  });

const useAnnotateCotaSentences = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.annotateCotaSentence,
    onSuccess: (cota) => {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Updated annotations in Concept Over Time Analysis "${cota.name}"`,
    },
  });

const useRemoveCotaSentences = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.removeCotaSentence,
    onSuccess: (cota) => {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
    },
    meta: {
      successMessage: (cota: COTARead) => `Removed sentences from Concept Over Time Analysis "${cota.name}"`,
    },
  });

const useResetCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.resetCota,
    onSuccess: (cota) => {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) =>
        prev ? { ...prev, [cota.id]: cota } : { [cota.id]: cota },
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cota.id] });
    },
    meta: {
      successMessage: (cota: COTARead) => `Reset Concept Over Time Analysis "${cota.name}"`,
    },
  });

// delete mutations
const useDeleteCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.deleteById,
    onSuccess: (cota) => {
      queryClient.setQueryData<CotaMap>([QueryKey.PROJECT_COTAS, cota.project_id], (prev) => {
        if (!prev) return prev;
        const newData = { ...prev };
        delete newData[cota.id];
        return newData;
      });
    },
    meta: {
      successMessage: (cota: COTARead) => `Deleted Concept Over Time Analysis "${cota.name}"`,
    },
  });

// COTA REFINEMENT JOB QUERIES
const usePollMostRecentRefinementJob = (cotaId: number | undefined) => {
  return useQuery<COTARefinementJobRead | null, Error>({
    queryKey: [QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cotaId],
    queryFn: () =>
      ConceptOverTimeAnalysisService.getMostRecentCotaJob({
        cotaId: cotaId!,
      }),
    enabled: !!cotaId,
    refetchInterval: (query) => {
      if (query.state.data?.status) {
        switch (query.state.data.status) {
          case BackgroundJobStatus.ERRORNEOUS:
          case BackgroundJobStatus.FINISHED:
            // TODO: maybe invalidate the cota query here or set it directly (see CotaControl.tsx)
            return false;
          case BackgroundJobStatus.WAITING:
          case BackgroundJobStatus.RUNNING:
            return 1000;
        }
      }
      return false;
    },
  });
};

// COTA REFINEMENT JOB MUTATIONS
const useRefineCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.refineCotaById,
    onSuccess: (cotaRefinementJob) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cotaRefinementJob.cota.id],
      });
    },
    meta: {
      successMessage: (job: COTARefinementJobRead) => `Started refinement job for "${job.cota.name}"`,
    },
  });

const CotaHooks = {
  useGetCota,
  useGetProjectCotaList,
  useCreateCota,
  useDuplicateCota,
  useUpdateCota,
  useAnnotateCotaSentences,
  useRemoveCotaSentences,
  useResetCota,
  useDeleteCota,
  usePollMostRecentRefinementJob,
  useRefineCota,
};

export default CotaHooks;
