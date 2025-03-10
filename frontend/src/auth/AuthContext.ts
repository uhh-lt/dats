import { createContext } from "react";
import { UserAuthorizationHeaderData } from "../api/openapi/models/UserAuthorizationHeaderData.ts";
import { UserRead } from "../api/openapi/models/UserRead.ts";
import { LoginStatus } from "./LoginStatus.ts";

interface AuthContextType {
  user: UserRead | undefined;
  updateAuthData: (authData: UserAuthorizationHeaderData) => void;
  logout: () => void;
  loginStatus: LoginStatus;
}

export const AuthContext = createContext<AuthContextType | null>(null);
