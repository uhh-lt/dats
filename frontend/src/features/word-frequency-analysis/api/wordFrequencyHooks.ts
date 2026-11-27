import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { useMutation } from "@tanstack/react-query";
import { wordFrequencyQueries } from "./wordFrequencyQueries";

const useExportWordFrequencies = () =>
  useMutation({
    mutationKey: [...wordFrequencyQueries.all(), "exportWordFrequencies"],
    mutationFn: WordFrequencyService.export,
  });

export const WordFrequencyHooks = {
  useExportWordFrequencies,
};
