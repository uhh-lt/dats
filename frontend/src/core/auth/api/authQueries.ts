import { GeneralService } from "@api/services/GeneralService";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for authentication and the instance configuration that the login needs (OIDC, Sentry, ...).
 * The login / logout / refresh mutations are in the AuthProvider and use the root key.
 *
 *   authQueries.all()           ["auth"]
 *   authQueries.instanceInfo()  ["auth", "instanceInfo"]
 */
export const authQueries = {
  all: () => ["auth"] as const,

  instanceInfo: () =>
    queryOptions({
      queryKey: [...authQueries.all(), "instanceInfo"] as const,
      queryFn: () => GeneralService.info(),
      staleTime: Infinity,
    }),
};
