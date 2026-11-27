import { ConceptOverTimeAnalysesService } from "@api/services/ConceptOverTimeAnalysesService";
import { queryClient } from "@api/queryClient";
import { Feature, featureTitle } from "@core/feature";
import { ConceptOverTimeAnalysisRead } from "@models/ConceptOverTimeAnalysisRead";
import { useMutation } from "@tanstack/react-query";
import { cotaQueries } from "./cotaQueries";

// the title of the feature, read when a message is shown (the project route has loaded the features)
const cotaTitle = () => featureTitle(queryClient, Feature.CONCEPTS_OVER_TIME);

const useCreateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "createCota"],
    mutationFn: ConceptOverTimeAnalysesService.create,
    meta: {
      datsEvent: "COTA_CREATED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Created new ${cotaTitle()} "${cota.name}"`,
    },
  });

const useDuplicateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "duplicateCota"],
    mutationFn: ConceptOverTimeAnalysesService.duplicate,
    meta: {
      datsEvent: "COTA_CREATED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Duplicated ${cotaTitle()} "${cota.name}"`,
    },
  });

const useUpdateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "updateCota"],
    mutationFn: ConceptOverTimeAnalysesService.updateById,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Updated ${cotaTitle()} "${cota.name}"`,
    },
  });

const useAnnotateCotaSentences = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "annotateCotaSentences"],
    mutationFn: ConceptOverTimeAnalysesService.annotateSentences,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Updated annotations in ${cotaTitle()} "${cota.name}"`,
    },
  });

const useRemoveCotaSentences = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "removeCotaSentences"],
    mutationFn: ConceptOverTimeAnalysesService.removeSentences,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Removed sentences from ${cotaTitle()} "${cota.name}"`,
    },
  });

const useResetCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "resetCota"],
    mutationFn: ConceptOverTimeAnalysesService.reset,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Reset ${cotaTitle()} "${cota.name}"`,
    },
  });

const useDeleteCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "deleteCota"],
    mutationFn: ConceptOverTimeAnalysesService.deleteById,
    meta: {
      datsEvent: "COTA_DELETED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Deleted ${cotaTitle()} "${cota.name}"`,
    },
  });

const useRefineCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "refineCota"],
    mutationFn: ConceptOverTimeAnalysesService.refine,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: ConceptOverTimeAnalysisRead) => `Started refinement job for "COTA ${cota.id}"`,
    },
  });

export const CotaHooks = {
  useCreateCota,
  useDuplicateCota,
  useUpdateCota,
  useAnnotateCotaSentences,
  useRemoveCotaSentences,
  useResetCota,
  useDeleteCota,
  useRefineCota,
};
