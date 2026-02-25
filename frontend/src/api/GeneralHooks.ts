import { useQuery } from "@tanstack/react-query";

import { QueryKey } from "./QueryKey";
import { InstanceInfo } from "./openapi/models/InstanceInfo";
import { GeneralService } from "./openapi/services/GeneralService";
import { RagService } from "./openapi/services/RagService";

const useGetInstanceInfo = () =>
  useQuery<InstanceInfo, Error>({
    queryKey: [QueryKey.INSTANCE_INFO],
    queryFn: () => GeneralService.info(),
    staleTime: Infinity,
  });

const useGetAvailableLLMs = () =>
  useQuery<string[], Error>({
    queryKey: [QueryKey.AVAILABLE_LLMS],
    queryFn: () => RagService.getAvailableModels(),
  });

export const GeneralHooks = {
  useGetInstanceInfo,
  useGetAvailableLLMs,
};
