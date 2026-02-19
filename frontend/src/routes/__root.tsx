import { CssBaseline } from "@mui/material";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AuthState } from "../auth/AuthState.ts";
import SnackbarDialog from "../components/SnackbarDialog/SnackbarDialog.tsx";
import NotFound from "../views/NotFound.tsx";

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
