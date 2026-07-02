import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
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
