import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginStatus } from "../../features/auth/LoginStatus.ts";

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
