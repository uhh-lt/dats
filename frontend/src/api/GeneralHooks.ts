import { useQuery } from "@tanstack/react-query";

import { QueryKey } from "./QueryKey.ts";
import { InstanceInfo } from "./openapi/models/InstanceInfo.ts";
import { GeneralService } from "./openapi/services/GeneralService.ts";

const useGetInstanceInfo = () =>
  useQuery<InstanceInfo, Error>({
    queryKey: [QueryKey.INSTANCE_INFO],
    queryFn: () => GeneralService.info(),
    staleTime: Infinity,
  });

export const GeneralHooks = {
  useGetInstanceInfo,
};
