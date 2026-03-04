import { LinkButton } from "@components/links";
import { AuthState } from "@core/auth";
import { SnackbarDialog } from "@core/notification";
import { Box, Container, CssBaseline, Typography } from "@mui/material";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

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

function NotFound() {
  return (
    <Container maxWidth="md">
      <Typography variant={"h3"} gutterBottom mt={3} textAlign="center">
        Whoops!
      </Typography>
      <Typography variant={"h5"} gutterBottom mt={3} textAlign="center">
        404 Page Not Found
      </Typography>
      <Typography variant={"body1"} gutterBottom mt={3} textAlign="center">
        We can't find the page you're looking for. Go back to projects?
      </Typography>
      <Box display="flex" mt={5}>
        <LinkButton to="/projects" variant="contained" color="primary" sx={{ mx: "auto" }}>
          Return to projects
        </LinkButton>
      </Box>
    </Container>
  );
}
