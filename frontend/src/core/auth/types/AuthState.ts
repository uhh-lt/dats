import { UserAuthorizationHeaderData } from "@api/models/UserAuthorizationHeaderData";
import { UserRead } from "@api/models/UserRead";

export interface AuthState {
  user: UserRead | undefined;
  isAuthenticated: boolean;
  updateAuthData: (authData: UserAuthorizationHeaderData) => void;
  logout: () => void;
}
