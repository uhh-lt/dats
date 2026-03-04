import { LoginStatus } from "@core/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/")({
  beforeLoad: ({ context }) => {
    if (context.auth.loginStatus === LoginStatus.LOGGED_IN) {
      throw redirect({
        to: "/projects",
      });
    } else {
      throw redirect({
        to: "/login",
        search: { redirect: "/projects" },
      });
    }
  },
});
