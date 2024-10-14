import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { COTARead } from "./openapi/models/COTARead.ts";
import { COTARefinementJobRead } from "./openapi/models/COTARefinementJobRead.ts";
import { ConceptOverTimeAnalysisService } from "./openapi/services/ConceptOverTimeAnalysisService.ts";

const useGetCota = (cotaId: number | null | undefined) =>
  useQuery<COTARead, Error>({
    queryKey: [QueryKey.COTA, cotaId],
    queryFn: async () => {
      const data = await ConceptOverTimeAnalysisService.getById({ cotaId: cotaId! });
      return data;
    },
    retry: false,
    enabled: !!cotaId,
    select: (data) => data,
  });

const useGetUserCotas = (projectId: number | null | undefined) =>
  useQuery<COTARead[], Error>({
    queryKey: [QueryKey.COTAS_PROJECT_USER, projectId],
    queryFn: async () => {
      const data = await ConceptOverTimeAnalysisService.getByProjectAndUser({ projectId: projectId! });
      return data;
    },
    retry: false,
    enabled: !!projectId,
  });

const useCreateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.create,
    onSuccess: (cota) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA, cota.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTAS_PROJECT_USER, cota.project_id] });
    },
  });

const useUpdateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.updateById,
    onSuccess: (cota) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA, cota.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTAS_PROJECT_USER, cota.project_id] });
    },
  });

const useDuplicateCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.duplicateById,
    onSettled(data) {
      if (data) {
        queryClient.setQueryData<COTARead[]>([QueryKey.COTAS_PROJECT_USER, data.project_id], (prevCota) => {
          if (prevCota) {
            return [...prevCota, data];
          } else {
            return [data];
          }
        });
        queryClient.invalidateQueries({
          queryKey: [QueryKey.COTAS_PROJECT_USER, data.project_id],
        });
      }
    },
  });

const useDeleteCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.deleteById,
    onSuccess: (cota) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA, cota.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTAS_PROJECT_USER, cota.project_id] });
    },
  });

const useGetRefinementJob = (refinementJobId: string | null | undefined) =>
  useQuery<COTARefinementJobRead, Error>({
    queryKey: [QueryKey.COTA_REFINEMENT_JOB, refinementJobId],
    queryFn: () => ConceptOverTimeAnalysisService.getCotaJob({ cotaJobId: refinementJobId! }),
    retry: false,
    enabled: !!refinementJobId,
  });

const useRefineCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.refineCotaById,
    onSuccess: (cotaRefinementJob) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA_REFINEMENT_JOB, cotaRefinementJob.id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cotaRefinementJob.cota.id],
      });
    },
  });

const useResetCota = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.resetCota,
    onSuccess: (cota) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA, cota.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTAS_PROJECT_USER, cota.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cota.id] });
    },
  });

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

const useAnnotateCotaSentences = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.annotateCotaSentence,
    onSuccess: (cota) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA, cota.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTAS_PROJECT_USER, cota.project_id] });
    },
  });

const useRemoveCotaSentences = () =>
  useMutation({
    mutationFn: ConceptOverTimeAnalysisService.removeCotaSentence,
    onSuccess: (cota) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTA, cota.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COTAS_PROJECT_USER, cota.project_id] });
    },
  });

const CotaHooks = {
  useGetCota,
  useGetUserCotas,
  useCreateCota,
  useUpdateCota,
  useDuplicateCota,
  useDeleteCota,
  useGetRefinementJob,
  useRefineCota,
  useResetCota,
  usePollMostRecentRefinementJob,
  useAnnotateCotaSentences,
  useRemoveCotaSentences,
};

export default CotaHooks;
