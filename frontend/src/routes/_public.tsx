import { RouteErrorPanel } from "@components/error";
import { LinkButton } from "@components/links";
import { Box, Button, Container, Stack } from "@mui/material";
import { Outlet, createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({
  component: PublicRouteLayout,
  errorComponent: PublicRouteErrorBoundary,
});

function PublicRouteFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Stack
        direction="row"
        p={3}
        gap={3}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <img src="/logo1.png" alt="Logo 1" height={68} loading="eager" decoding="async" fetchPriority="high" />
        <img src="/logo2.png" alt="Logo 2" height={68} loading="eager" decoding="async" fetchPriority="high" />
      </Stack>
      {children}
    </>
  );
}

function PublicRouteLayout() {
  return (
    <PublicRouteFrame>
      <Outlet />
    </PublicRouteFrame>
  );
}

function PublicRouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <PublicRouteFrame>
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", py: 5 }}>
        <Container maxWidth="sm">
          <RouteErrorPanel
            title="This page is currently unavailable"
            description="Please retry the request or return to the login screen."
            error={error}
            actions={
              <>
                <Button variant="contained" color="secondary" onClick={reset}>
                  Try again
                </Button>
                <LinkButton to="/login" variant="outlined" color="secondary">
                  Back to login
                </LinkButton>
              </>
            }
          />
        </Container>
      </Box>
    </PublicRouteFrame>
  );
}
