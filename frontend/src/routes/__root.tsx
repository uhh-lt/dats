import { CssBaseline } from "@mui/material";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import SnackbarDialog from "../components/SnackbarDialog/SnackbarDialog.tsx";
import { AuthState } from "../features/auth/AuthState.ts";
import NotFound from "../features/NotFound.tsx";

interface DATSRouterContext {
  auth: AuthState;
}

export const Route = createRootRouteWithContext<DATSRouterContext>()({
  component: RootRoute,
  notFoundComponent: NotFound,
});

function RootRoute() {
  return (
    <>
      <CssBaseline />
      <Outlet />
      <SnackbarDialog />
      <TanStackRouterDevtools />
    </>
  );
}
