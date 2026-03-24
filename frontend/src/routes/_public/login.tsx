import { LoginView } from "@features/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const loginSearchSchema = z.object({
  redirect: z.string().default("/projects"),
});

export const Route = createFileRoute("/_public/login")({
  validateSearch: zodValidator(loginSearchSchema),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect });
    }
  },
  component: LoginView,
});
