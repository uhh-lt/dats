import { UserAuthorizationHeaderData } from "@api/models/UserAuthorizationHeaderData";
import { UserRead } from "@api/models/UserRead";
import { LoginStatus } from "./LoginStatus";

export interface AuthState {
  user: UserRead | undefined;
  updateAuthData: (authData: UserAuthorizationHeaderData) => void;
  logout: () => void;
  loginStatus: LoginStatus;
}
