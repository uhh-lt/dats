import { useQuery } from "@tanstack/react-query";

import { InstanceInfo } from "@api/models/InstanceInfo";
import { GeneralService } from "@api/services/GeneralService";
import { RagService } from "@api/services/RagService";
import { QueryKey } from "./QueryKey";

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
