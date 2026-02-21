import { UserAuthorizationHeaderData } from "../../api/openapi/models/UserAuthorizationHeaderData.ts";
import { UserRead } from "../../api/openapi/models/UserRead.ts";
import { LoginStatus } from "./LoginStatus.ts";

export interface AuthState {
  user: UserRead | undefined;
  updateAuthData: (authData: UserAuthorizationHeaderData) => void;
  logout: () => void;
  loginStatus: LoginStatus;
}
