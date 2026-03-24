import { QueryKey } from "@api/hooks/QueryKey";
import { InstanceInfo } from "@api/models/InstanceInfo";
import { GeneralService } from "@api/services/GeneralService";
import { queryOptions } from "@tanstack/react-query";

export const instanceInfoQueryOptions = () =>
  queryOptions<InstanceInfo>({
    queryKey: [QueryKey.INSTANCE_INFO],
    queryFn: () => GeneralService.info(),
    staleTime: Infinity,
  });
