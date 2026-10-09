import { jobQueries, useJobRefetchInterval } from "@core/job";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { useQuery } from "@tanstack/react-query";

export const useLiveLLMJob = (llmJobId: string | undefined, initialData: LlmAssistantJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<LlmAssistantJobRead>();
  return useQuery({
    ...jobQueries.llm.byId(llmJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};
