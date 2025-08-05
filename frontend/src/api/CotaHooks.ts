import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { COTARead } from "./openapi/models/COTARead.ts";
import { COTARefinementJobRead } from "./openapi/models/COTARefinementJobRead.ts";
import { JobStatus } from "./openapi/models/JobStatus.ts";
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
const usePollCOTARefinementJob = (cotaRefinementJobId: string | null) => {
  return useQuery<COTARefinementJobRead | null, Error>({
    queryKey: [QueryKey.COTA_REFINEMENT_JOB, cotaRefinementJobId],
    queryFn: () =>
      ConceptOverTimeAnalysisService.getCotaJob({
        cotaJobId: cotaRefinementJobId!,
      }),
    enabled: !!cotaRefinementJobId,
    refetchInterval: (query) => {
      if (query.state.data?.status) {
        switch (query.state.data.status) {
          case JobStatus.CANCELED:
          case JobStatus.FAILED:
          case JobStatus.FINISHED:
          case JobStatus.STOPPED:
            // TODO: maybe invalidate the cota query here or set it directly (see CotaControl.tsx)
            return false;
          case JobStatus.DEFERRED:
          case JobStatus.QUEUED:
          case JobStatus.SCHEDULED:
          case JobStatus.STARTED:
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
      queryClient.setQueryData<COTARefinementJobRead>(
        [QueryKey.COTA_REFINEMENT_JOB, cotaRefinementJob.job_id],
        cotaRefinementJob,
      );
    },
    meta: {
      successMessage: (job: COTARefinementJobRead) => `Started refinement job for "COTA ${job.input.cota_id}"`,
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
  usePollCOTARefinementJob,
  useRefineCota,
};

export default CotaHooks;
