import { GeneralService } from "@api/services/GeneralService";
import { RagService } from "@api/services/RagService";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for general data of the DATS instance that no domain owns.
 *
 *   generalQueries.all()              ["general"]
 *   generalQueries.availableModels()  ["general", "availableModels"]
 *   generalQueries.instanceInfo()     ["general", "instanceInfo"]
 */
export const generalQueries = {
  all: () => ["general"] as const,

  // the LLMs the backend offers (used by the assistants of several features)
  availableModels: () =>
    queryOptions({
      queryKey: [...generalQueries.all(), "availableModels"] as const,
      queryFn: () => RagService.getAvailableModels(),
    }),

  // the configuration of the instance (is OIDC enabled, Sentry/Glitchtip DSN, ...)
  instanceInfo: () =>
    queryOptions({
      queryKey: [...generalQueries.all(), "instanceInfo"] as const,
      queryFn: () => GeneralService.info(),
      staleTime: Infinity,
    }),
};
