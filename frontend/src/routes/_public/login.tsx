import { generalQueries } from "@api/queries/generalQueries";
import { LoginView } from "@features/auth";
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
  // the query options are built once here; the loader and the view use the same ones
  context: () => ({ instanceInfoOptions: generalQueries.instanceInfo() }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.instanceInfoOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: LoginView,
});
