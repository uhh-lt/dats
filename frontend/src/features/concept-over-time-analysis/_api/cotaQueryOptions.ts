import { useJobRefetchInterval } from "@api/hooks/jobPolling";
import { cotaQueries } from "@api/queries/cotaQueries";
import { jobQueries } from "@api/queries/jobQueries";
import { queryClient } from "@api/queryClient";
import { ConceptOverTimeAnalysisService } from "@api/services/ConceptOverTimeAnalysisService";
import { COTARead } from "@models/COTARead";
import { COTARefinementJobRead } from "@models/COTARefinementJobRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useCreateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "createCota"],
    mutationFn: ConceptOverTimeAnalysisService.create,
    meta: {
      datsEvent: "COTA_CREATED",
      successMessage: (cota: COTARead) => `Created new Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useDuplicateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "duplicateCota"],
    mutationFn: ConceptOverTimeAnalysisService.duplicateById,
    meta: {
      datsEvent: "COTA_CREATED",
      successMessage: (cota: COTARead) => `Duplicated Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useUpdateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "updateCota"],
    mutationFn: ConceptOverTimeAnalysisService.updateById,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Updated Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useAnnotateCotaSentences = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "annotateCotaSentences"],
    mutationFn: ConceptOverTimeAnalysisService.annotateCotaSentence,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Updated annotations in Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useRemoveCotaSentences = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "removeCotaSentences"],
    mutationFn: ConceptOverTimeAnalysisService.removeCotaSentence,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Removed sentences from Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useResetCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "resetCota"],
    mutationFn: ConceptOverTimeAnalysisService.resetCota,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Reset Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useDeleteCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "deleteCota"],
    mutationFn: ConceptOverTimeAnalysisService.deleteById,
    meta: {
      datsEvent: "COTA_DELETED",
      successMessage: (cota: COTARead) => `Deleted Concept Over Time Analysis "${cota.name}"`,
    },
  });

export const useLiveCOTARefinementJob = (cotaRefinementJobId: string | null) => {
  const jobRefetchInterval = useJobRefetchInterval<COTARefinementJobRead>();
  return useQuery({
    ...jobQueries.cotaRefinement.byId(cotaRefinementJobId),
    refetchInterval: jobRefetchInterval,
  });
};

export const useRefineCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "refineCota"],
    mutationFn: ConceptOverTimeAnalysisService.refineCota,
    onSuccess(cota) {
      queryClient.setQueryData(cotaQueries.byProject(cota.project_id).queryKey, (prev) =>
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
    ...cotaQueries.byProject(projectId!),
    select: (data) => (cotaId != null ? data[cotaId] : undefined),
    enabled: projectId !== undefined && cotaId != null,
  });
};

export const useGetProjectCotaList = () => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...cotaQueries.byProject(projectId!),
    select: (data) => Object.values(data),
    enabled: projectId !== undefined,
  });
};
