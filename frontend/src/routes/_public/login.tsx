// the route builds its query options itself, so it needs the query definition of the global api
// eslint-disable-next-line boundaries/element-types
import { generalQueries } from "@api/general/generalQueries";
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
  context: () => ({ instanceInfoOptions: generalQueries.instanceInfo() }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.instanceInfoOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: LoginView,
});
