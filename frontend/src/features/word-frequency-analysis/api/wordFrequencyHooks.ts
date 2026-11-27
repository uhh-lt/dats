import { WordFrequenciesService } from "@api/services/WordFrequenciesService";
import { useMutation } from "@tanstack/react-query";
import { wordFrequencyQueries } from "./wordFrequencyQueries";

const useExportWordFrequencies = () =>
  useMutation({
    mutationKey: [...wordFrequencyQueries.all(), "exportWordFrequencies"],
    mutationFn: WordFrequenciesService.export,
  });

export const WordFrequencyHooks = {
  useExportWordFrequencies,
};
