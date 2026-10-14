import { RagService } from "@api/services/RagService";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for general data of the DATS instance that no domain owns.
 *
 *   generalQueries.all()              ["general"]
 *   generalQueries.availableModels()  ["general", "availableModels"]
 */
export const generalQueries = {
  all: () => ["general"] as const,

  // the LLMs the backend offers (used by the assistants of several features)
  availableModels: () =>
    queryOptions({
      queryKey: [...generalQueries.all(), "availableModels"] as const,
      queryFn: () => RagService.getAvailableModels(),
    }),
};
