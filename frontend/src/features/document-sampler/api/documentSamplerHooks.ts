import { AnalysisService } from "@api/services/AnalysisService";
import { SampledSdocsResults } from "@models/SampledSdocsResults";
import { useMutation } from "@tanstack/react-query";
import { documentSamplerQueries } from "./documentSamplerQueries";

// What happens with the sampled documents depends on the view (it maps them to the chart), so the callback is passed in.
const useSampleSdocsByTags = ({ onSuccess }: { onSuccess: (data: SampledSdocsResults[]) => void }) =>
  useMutation({
    mutationKey: [...documentSamplerQueries.all(), "aggregateSdocsByTags"],
    mutationFn: AnalysisService.sampleSdocsByTags,
    onSuccess,
  });

export const DocumentSamplerHooks = {
  useSampleSdocsByTags,
};
