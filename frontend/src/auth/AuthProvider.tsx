import React, { createContext, useContext, useState } from "react";
import { OpenAPI, UserRead, UserService } from "../api/openapi";
import { QueryObserverResult, useQuery } from "@tanstack/react-query";

// init once
OpenAPI.BASE = process.env.REACT_APP_SERVER || "";
OpenAPI.TOKEN = localStorage.getItem("dwts-access") || undefined;

interface AuthContextType {
  user: QueryObserverResult<UserRead, Error>;
  login: (user: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => useContext(AuthContext)!;

interface AuthContextProps {
  children?: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthContextProps): any => {
  // state
  const [accessToken, setAccessToken] = useState<string | undefined>(localStorage.getItem("dwts-access") || undefined);
  const user = useQuery<UserRead, Error>(["me", accessToken], UserService.getMeUserMeGet, {
    enabled: !!accessToken,
    retry: false,
  });

  // methods
  /**
   * Login and save access token
   * @throws ApiError
   */
  const login = async (username: string, password: string) => {
    const authData = await UserService.loginUserLoginPost({ formData: { username, password } });
    localStorage.setItem("dwts-access", authData.access_token);
    OpenAPI.TOKEN = authData.access_token;
    setAccessToken(authData.access_token);
  };

  const logout = () => {
    localStorage.removeItem("dwts-access");
    OpenAPI.TOKEN = undefined;
    setAccessToken(undefined);
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        user,
        isLoggedIn: user.isSuccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
