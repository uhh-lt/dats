import { AnalysisService } from "@api/services/AnalysisService";
import { SampledSdocsResults } from "@models/SampledSdocsResults";
import { useMutation } from "@tanstack/react-query";

// the root of the mutation keys (the document sampler has no queries)
const documentSamplerKey = ["documentSampler"] as const;

// What happens with the sampled documents depends on the view (it maps them to the chart), so the callback is passed in.
const useSampleSdocsByTags = ({ onSuccess }: { onSuccess: (data: SampledSdocsResults[]) => void }) =>
  useMutation({
    mutationKey: [...documentSamplerKey, "sampleSdocsByTags"],
    mutationFn: AnalysisService.sampleSdocsByTags,
    onSuccess,
  });

export const DocumentSamplerHooks = {
  useSampleSdocsByTags,
};
