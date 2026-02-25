import { UserAuthorizationHeaderData } from "../../../api/openapi/models/UserAuthorizationHeaderData";
import { UserRead } from "../../../api/openapi/models/UserRead";
import { LoginStatus } from "./LoginStatus";

export interface AuthState {
  user: UserRead | undefined;
  updateAuthData: (authData: UserAuthorizationHeaderData) => void;
  logout: () => void;
  loginStatus: LoginStatus;
}
