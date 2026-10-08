import { GeneralService } from "@api/services/GeneralService";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for general information about the DATS instance.
 *
 *   generalQueries.all()           ["general"]
 *   generalQueries.instanceInfo()  ["general", "instanceInfo"]
 */
export const generalQueries = {
  all: () => ["general"] as const,

  instanceInfo: () =>
    queryOptions({
      queryKey: [...generalQueries.all(), "instanceInfo"] as const,
      queryFn: () => GeneralService.info(),
      staleTime: Infinity,
    }),
};
