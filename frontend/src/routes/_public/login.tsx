import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginStatus } from "../../core/auth/types/LoginStatus";
import Login from "../../features/auth/views/login/LoginView";

export const Route = createFileRoute("/_public/login")({
  validateSearch: (search) => ({
    redirect: (search.redirect as string) || "/projects",
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.loginStatus === LoginStatus.LOGGED_IN) {
      throw redirect({ to: search.redirect });
    }
  },
  component: Login,
});
