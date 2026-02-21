import { useQuery } from "@tanstack/react-query";

import { QueryKey } from "./QueryKey.ts";
import { InstanceInfo } from "./openapi/models/InstanceInfo.ts";
import { GeneralService } from "./openapi/services/GeneralService.ts";
import { RagService } from "./openapi/services/RagService.ts";

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
