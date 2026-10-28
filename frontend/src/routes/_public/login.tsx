// the route builds its query options itself, so it needs the query definition of the global api
// eslint-disable-next-line boundaries/element-types
import { generalQueries } from "@api/general/generalQueries";
import { LoginView } from "@features/auth";
import { CircularProgress } from "@mui/material";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const DEFAULT_REDIRECT = "/projects";

// The redirect target is the full app-internal href (path, search params and hash) of the page that required login.
// Only same-origin paths are allowed, so the login page cannot be abused as an open redirect.
const isAppPath = (href: string) => href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\");

const loginSearchSchema = z.object({
  redirect: fallback(z.string().refine(isAppPath), DEFAULT_REDIRECT).default(DEFAULT_REDIRECT),
});

export const Route = createFileRoute("/_public/login")({
  validateSearch: zodValidator(loginSearchSchema),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ href: search.redirect });
    }
  },
  context: () => ({ instanceInfoOptions: generalQueries.instanceInfo() }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.instanceInfoOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: LoginView,
});
