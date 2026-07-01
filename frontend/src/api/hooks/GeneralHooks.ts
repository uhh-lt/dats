import { queryOptions, useQuery } from "@tanstack/react-query";

import { InstanceInfo } from "@api/models/InstanceInfo";
import { GeneralService } from "@api/services/GeneralService";
import { QueryKey } from "./QueryKey";

const instanceInfoQueryOptions = () =>
  queryOptions<InstanceInfo>({
    queryKey: [QueryKey.INSTANCE_INFO],
    queryFn: () => GeneralService.info(),
    staleTime: Infinity,
  });

const useGetInstanceInfo = () =>
  useQuery<InstanceInfo, Error>({
    queryKey: [QueryKey.INSTANCE_INFO],
    queryFn: () => GeneralService.info(),
    staleTime: Infinity,
  });

export const GeneralHooks = {
  instanceInfoQueryOptions,
  useGetInstanceInfo,
};
