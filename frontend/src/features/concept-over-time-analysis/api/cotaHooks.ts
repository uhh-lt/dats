import { ConceptOverTimeAnalysisService } from "@api/services/ConceptOverTimeAnalysisService";
import { queryClient } from "@api/queryClient";
import { Feature, featureTitle } from "@core/feature";
import { COTARead } from "@models/COTARead";
import { useMutation } from "@tanstack/react-query";
import { cotaQueries } from "./cotaQueries";

// the title of the feature, read when a message is shown (the project route has loaded the features)
const cotaTitle = () => featureTitle(queryClient, Feature.CONCEPTS_OVER_TIME);

const useCreateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "createCota"],
    mutationFn: ConceptOverTimeAnalysisService.create,
    meta: {
      datsEvent: "COTA_CREATED",
      successMessage: (cota: COTARead) => `Created new ${cotaTitle()} "${cota.name}"`,
    },
  });

const useDuplicateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "duplicateCota"],
    mutationFn: ConceptOverTimeAnalysisService.duplicateById,
    meta: {
      datsEvent: "COTA_CREATED",
      successMessage: (cota: COTARead) => `Duplicated ${cotaTitle()} "${cota.name}"`,
    },
  });

const useUpdateCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "updateCota"],
    mutationFn: ConceptOverTimeAnalysisService.updateById,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Updated ${cotaTitle()} "${cota.name}"`,
    },
  });

const useAnnotateCotaSentences = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "annotateCotaSentences"],
    mutationFn: ConceptOverTimeAnalysisService.annotateCotaSentence,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Updated annotations in ${cotaTitle()} "${cota.name}"`,
    },
  });

const useRemoveCotaSentences = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "removeCotaSentences"],
    mutationFn: ConceptOverTimeAnalysisService.removeCotaSentence,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Removed sentences from ${cotaTitle()} "${cota.name}"`,
    },
  });

const useResetCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "resetCota"],
    mutationFn: ConceptOverTimeAnalysisService.resetCota,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Reset ${cotaTitle()} "${cota.name}"`,
    },
  });

const useDeleteCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "deleteCota"],
    mutationFn: ConceptOverTimeAnalysisService.deleteById,
    meta: {
      datsEvent: "COTA_DELETED",
      successMessage: (cota: COTARead) => `Deleted ${cotaTitle()} "${cota.name}"`,
    },
  });

const useRefineCota = () =>
  useMutation({
    mutationKey: [...cotaQueries.all(), "refineCota"],
    mutationFn: ConceptOverTimeAnalysisService.refineCota,
    meta: {
      datsEvent: "COTA_UPDATED",
      successMessage: (cota: COTARead) => `Started refinement job for "COTA ${cota.id}"`,
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
