import { ApiKeyService } from "@api/services/ApiKeyService";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for API keys.
 *
 *   apiKeyQueries.all()   ["apiKeys"]
 *   apiKeyQueries.list()  ["apiKeys", "list"]
 */
export const apiKeyQueries = {
  all: () => ["apiKeys"] as const,

  // all API keys of the logged-in user
  list: () =>
    queryOptions({
      queryKey: [...apiKeyQueries.all(), "list"] as const,
      queryFn: () => ApiKeyService.listApiKeys(),
      staleTime: 1000 * 60 * 5,
    }),
};
