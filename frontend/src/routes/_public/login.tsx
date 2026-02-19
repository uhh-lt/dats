import { createFileRoute, redirect } from "@tanstack/react-router";
import Login from "../..//views/login/Login.tsx";
import { LoginStatus } from "../../auth/LoginStatus.ts";

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
