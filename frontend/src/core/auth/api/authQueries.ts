/**
 * Root key of the authentication mutations (login, logout, token refresh). There is nothing to query:
 * the auth state lives in the AuthProvider.
 *
 *   authQueries.all()   ["auth"]
 */
export const authQueries = {
  all: () => ["auth"] as const,
};
