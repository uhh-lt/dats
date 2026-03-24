import { ApiError } from "@api/core/ApiError";
import { OpenAPI } from "@api/core/OpenAPI";
import { QueryKey } from "@api/hooks/QueryKey";
import { UserAuthorizationHeaderData } from "@api/models/UserAuthorizationHeaderData";
import { UserRead } from "@api/models/UserRead";
import { queryClient } from "@api/queryClient";
import { AuthenticationService } from "@api/services/AuthenticationService";
import { UserService } from "@api/services/UserService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContext } from "../types/AuthContext";

// init once
OpenAPI.BASE = "/api";
OpenAPI.TOKEN = localStorage.getItem("dats-access") || undefined;

const ACCESS_TOKEN_KEY = "dats-access";
const ACCESS_TOKEN_EXPIRES_KEY = "dats-access-expires";
const REFRESH_TOKEN_KEY = "dats-refresh-access";

function readStoredDate(key: string): Date | undefined {
  const value = localStorage.getItem(key);
  return value ? new Date(value) : undefined;
}

function isAccessTokenExpired(expiresAt: Date | undefined): boolean {
  if (expiresAt === undefined) {
    return true;
  }
  return expiresAt.getTime() < Date.now();
}

interface AuthContextProps {
  children?: ReactNode;
}

/**
 * Global authentication provider for the frontend.
 *
 * Responsibilities:
 * - Persist and restore auth credentials (access token, refresh token, expiry) from localStorage.
 * - Keep the generated API client (`OpenAPI.TOKEN`) in sync with the current access token.
 * - Resolve the current session by fetching `/user/me` when an access token exists.
 * - Proactively refresh access tokens shortly before expiry.
 * - Perform local logout immediately and trigger best-effort server-side revoke.
 *
 * Exposed state contract:
 * - `isAuthenticated`: current session is valid and user data is available.
 *
 * Usage:
 * - Wrap the application in this provider.
 * - Pass `useAuth()` output into TanStack Router context via `RouterProvider`.
 * - Use route-level `beforeLoad` checks for access control.
 *
 * Rendering behavior:
 * - While restoring/validating a persisted session, the provider renders a loading fallback.
 * - Therefore, consumers inside the provider tree only see stable auth state.
 */
export const AuthProvider = ({ children }: AuthContextProps) => {
  // --- credential state ---
  const [accessToken, setAccessToken] = useState<string | undefined>(
    localStorage.getItem(ACCESS_TOKEN_KEY) || undefined,
  );
  const [accessTokenExpires, setAccessTokenExpires] = useState<Date | undefined>(() =>
    readStoredDate(ACCESS_TOKEN_EXPIRES_KEY),
  );
  const [refreshToken, setRefreshToken] = useState<string | undefined>(
    localStorage.getItem(REFRESH_TOKEN_KEY) || undefined,
  );

  const clearLocalAuthData = useCallback((clearQueries: boolean) => {
    OpenAPI.TOKEN = undefined;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(undefined);
    setRefreshToken(undefined);
    setAccessTokenExpires(undefined);
    if (clearQueries) {
      queryClient.clear();
    }
  }, []);

  const updateAuthData = useCallback((authData: UserAuthorizationHeaderData) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, authData.access_token);
    OpenAPI.TOKEN = authData.access_token;
    setAccessToken(authData.access_token);

    localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, authData.access_token_expires);
    setAccessTokenExpires(new Date(authData.access_token_expires));

    localStorage.setItem(REFRESH_TOKEN_KEY, authData.refresh_token);
    setRefreshToken(authData.refresh_token);
  }, []);

  // --- session resolution (/user/me) ---
  const user = useQuery<UserRead, Error>({
    queryKey: [QueryKey.ME, accessToken],
    queryFn: UserService.getMe,
    retry: false,
    enabled: accessToken !== undefined && !isAccessTokenExpired(accessTokenExpires),
  });
  // Session validation error handling.
  useEffect(() => {
    if (user.isError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      clearLocalAuthData(false);
    }
  }, [user.isError, clearLocalAuthData]);

  // Logout action.
  const { mutate: logoutMutation } = useMutation({
    mutationFn: AuthenticationService.logout,
    retry: false,
  });

  const logout = useCallback(() => {
    const refreshTokenToRevoke = refreshToken;

    // Clear state
    clearLocalAuthData(true);

    if (refreshTokenToRevoke !== undefined) {
      logoutMutation({ refreshToken: refreshTokenToRevoke });
    }
  }, [refreshToken, clearLocalAuthData, logoutMutation]);

  // Refresh access token shortly before expiry.
  const { mutate: refreshAccessTokenMutation } = useMutation({
    mutationFn: AuthenticationService.refreshAccessToken,
    retry: false,
    onSuccess(data) {
      updateAuthData(data);
    },
    onError(error) {
      if (error instanceof ApiError && error.status === 403) {
        // Refresh token expired, it's time to log out
        logout();
      }
    },
  });

  useEffect(() => {
    if (accessTokenExpires === undefined || refreshToken === undefined) {
      return;
    }

    // Refresh 60 seconds before the access token expires
    const refreshBefore = 60 * 1000;
    const msToWait = Math.max(accessTokenExpires.getTime() - Date.now() - refreshBefore, 0);
    const handle = setTimeout(() => {
      refreshAccessTokenMutation({ refreshToken });
    }, msToWait);

    return () => clearTimeout(handle);
  }, [accessTokenExpires, refreshToken, refreshAccessTokenMutation]);

  return (
    <AuthContext.Provider
      value={{
        updateAuthData,
        logout,
        user: user.data,
        isAuthenticated: user.data !== undefined,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
