import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginStatus } from "../../features/auth/LoginStatus.ts";
import Login from "../../features/login/Login.tsx";

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
