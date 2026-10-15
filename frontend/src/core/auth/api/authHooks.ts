import { ApiError } from "@api/core/ApiError";
import { AuthenticationService } from "@api/services/AuthenticationService";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";

type LoginVariables = Parameters<typeof AuthenticationService.login>[0];
type LoginData = Awaited<ReturnType<typeof AuthenticationService.login>>;
type RefreshVariables = Parameters<typeof AuthenticationService.refreshAccessToken>[0];
type RefreshData = Awaited<ReturnType<typeof AuthenticationService.refreshAccessToken>>;

// the root of the mutation keys of the authentication (there are no auth queries: the session lives in the AuthProvider)
const authKey = ["auth"] as const;

// Login, logout and token refresh are mutations of the authentication. What happens with the result depends on the
// caller (the login view navigates, the AuthProvider stores the tokens), so the callbacks are passed in.

const useLogin = (options?: Pick<UseMutationOptions<LoginData, ApiError, LoginVariables>, "onSuccess" | "onError">) =>
  useMutation({
    mutationKey: [...authKey, "login"],
    mutationFn: AuthenticationService.login,
    retry: false,
    ...options,
  });

const useLogout = () =>
  useMutation({
    mutationKey: [...authKey, "logout"],
    mutationFn: AuthenticationService.logout,
    retry: false,
  });

const useRefreshAccessToken = (
  options?: Pick<UseMutationOptions<RefreshData, ApiError, RefreshVariables>, "onSuccess" | "onError">,
) =>
  useMutation({
    mutationKey: [...authKey, "refreshAccessToken"],
    mutationFn: AuthenticationService.refreshAccessToken,
    retry: false,
    ...options,
  });

export const AuthHooks = {
  useLogin,
  useLogout,
  useRefreshAccessToken,
};
