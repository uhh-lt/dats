import { useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/openapi/core/ApiError.ts";
import { OpenAPI } from "../api/openapi/core/OpenAPI.ts";
import { UserAuthorizationHeaderData } from "../api/openapi/models/UserAuthorizationHeaderData.ts";
import { UserRead } from "../api/openapi/models/UserRead.ts";
import { AuthenticationService } from "../api/openapi/services/AuthenticationService.ts";
import { UserService } from "../api/openapi/services/UserService.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { LoginStatus } from "./LoginStatus.ts";

// init once
OpenAPI.BASE = import.meta.env.VITE_APP_SERVER || "";
OpenAPI.TOKEN = localStorage.getItem("dwts-access") || undefined;

interface AuthContextType {
  user: UserRead | undefined;
  login: (user: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  loginStatus: LoginStatus;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthContextProps {
  children?: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthContextProps) => {
  // state
  const [accessToken, setAccessToken] = useState<string | undefined>(localStorage.getItem("dwts-access") || undefined);

  const expiryString = localStorage.getItem("dwts-access-expires");
  const persistedAccessTokenExpires = expiryString ? new Date(expiryString) : undefined;
  const [accessTokenExpires, setAccessTokenExpires] = useState<Date | undefined>(persistedAccessTokenExpires);

  const [refreshToken, setRefreshToken] = useState<string | undefined>(
    localStorage.getItem("dwts-refresh-access") || undefined,
  );

  const internalUser = useQuery<UserRead, Error>({
    queryKey: ["me", accessToken],
    queryFn: UserService.getMe,
    retry: false,
  });

  const [user, setUser] = useState<UserRead>();
  useEffect(() => {
    if (internalUser.isLoading) {
      return;
    }

    if (internalUser.isError && internalUser.error instanceof ApiError && internalUser.error.status === 403) {
      // Our credentials are invalid, we're not logged in anymore.
      setUser(undefined);
      return;
    }

    if (internalUser?.data?.id !== user?.id) {
      setUser(internalUser.data);
    }
  }, [internalUser, user]);

  const updateAuthData = (authData: UserAuthorizationHeaderData) => {
    localStorage.setItem("dwts-access", authData.access_token);
    OpenAPI.TOKEN = authData.access_token;
    setAccessToken(authData.access_token);

    localStorage.setItem("dwts-access-expires", authData.access_token_expires);
    setAccessTokenExpires(new Date(authData.access_token_expires));

    localStorage.setItem("dwts-refresh-access", authData.refresh_token);
    setRefreshToken(authData.refresh_token);
  };

  // methods
  /**
   * Login and save access token
   * @throws ApiError
   */
  const login = useCallback(async (username: string, password: string) => {
    const authData = await AuthenticationService.login({
      formData: { username, password },
    });
    updateAuthData(authData);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (refreshToken !== undefined) {
        await AuthenticationService.logout({ refreshToken });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        // refresh token expired, keep logging the user out
      } else {
        // There's a bug, logout didn't work
        console.error("Error while logging out:", e);
        return;
      }
    }
    OpenAPI.TOKEN = undefined;
    localStorage.removeItem("dwts-access");
    localStorage.removeItem("dwts-access-expires");
    localStorage.removeItem("dwts-refresh-access");
    setAccessToken(undefined);
    setRefreshToken(undefined);
    setAccessTokenExpires(undefined);
    queryClient.clear();
  }, [refreshToken]);

  useEffect(() => {
    if (accessTokenExpires === undefined) {
      return;
    }

    const refreshAccessToken = async () => {
      if (refreshToken === undefined) {
        console.error("Can't refresh access token, no refresh token set");
        return;
      }
      try {
        const authData = await AuthenticationService.refreshAccessToken({
          refreshToken,
        });
        updateAuthData(authData);
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          // Refresh token expired, it's time to log out
          logout();
        }
      }
    };

    // Refresh 60 seconds before the access token expires
    const refreshBefore = 60 * 1000;
    const msToWait = Math.max(accessTokenExpires.getTime() - Date.now() - refreshBefore, 0);
    const handle = setTimeout(() => {
      refreshAccessToken();
    }, msToWait);

    return () => clearTimeout(handle);
  }, [accessTokenExpires, refreshToken, logout]);

  let status;
  const definitelyLoggedIn = user !== undefined || internalUser.isSuccess;
  const verifyingAccessToken = (internalUser.isLoading || internalUser.isFetching) && accessToken !== undefined;
  if (definitelyLoggedIn) {
    status = LoginStatus.LOGGED_IN;
  } else if (verifyingAccessToken) {
    status = LoginStatus.LOADING;
  } else {
    status = LoginStatus.LOGGED_OUT;
  }

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        user,
        loginStatus: status,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
