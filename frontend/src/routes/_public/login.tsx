import { LoginView, loginViewLoader } from "@features/auth";
import { CircularProgress } from "@mui/material";
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
  loader: ({ context }) =>
    loginViewLoader({
      queryClient: context.queryClient,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load instance information: {(error as Error).message}</div>,
  component: LoginView,
});
