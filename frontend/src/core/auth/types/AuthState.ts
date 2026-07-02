import { UserAuthorizationHeaderData } from "@models/UserAuthorizationHeaderData";
import { UserRead } from "@models/UserRead";

export interface AuthState {
  user: UserRead | undefined;
  isAuthenticated: boolean;
  updateAuthData: (authData: UserAuthorizationHeaderData) => void;
  logout: () => void;
}
