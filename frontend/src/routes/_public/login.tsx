import { LoginStatus } from "@core/auth";
import { LoginView } from "@features/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/login")({
  validateSearch: (search) => ({
    redirect: (search.redirect as string) || "/projects",
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.loginStatus === LoginStatus.LOGGED_IN) {
      throw redirect({ to: search.redirect });
    }
  },
  component: LoginView,
});
