import { DATSLogo } from "@components/DATSLogo";
import { RouteErrorPanel } from "@components/error";
import { LinkButton } from "@components/links";
import { AuthState } from "@core/auth";
import { SnackbarDialog } from "@core/notification";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { Alert, AlertTitle, alpha, Box, Button, Container, CssBaseline, Paper, Stack, Typography } from "@mui/material";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, type ErrorComponentProps, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

interface DATSRouterContext {
  auth: AuthState;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<DATSRouterContext>()({
  component: RootRoute,
  errorComponent: RootErrorBoundary,
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

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <RouteErrorPanel
          title="Unexpected application error"
          description="An unrecoverable error occurred while rendering the application shell."
          error={error}
          actions={
            <Button variant="contained" color="secondary" onClick={reset}>
              Try again
            </Button>
          }
        />
      </Container>
      <SnackbarDialog />
      <TanStackRouterDevtools />
    </>
  );
}

function NotFound() {
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
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <Container maxWidth="sm">
          <Stack spacing={4}>
            <DATSLogo />
            <Paper
              elevation={1}
              sx={{
                width: "100%",
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 3, md: 4 },
              }}
            >
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 66,
                      height: 66,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                    }}
                  >
                    <ErrorOutlineRoundedIcon color="warning" fontSize="large" />
                  </Box>
                  <Stack spacing={0.75}>
                    <Typography variant="h5">Page not found</Typography>
                    <Typography variant="body1" color="text.secondary">
                      The requested route does not exist.
                    </Typography>
                  </Stack>
                </Stack>

                <Alert severity="warning" variant="outlined">
                  <AlertTitle>Error 404</AlertTitle>
                  The requested route does not exist. Please check the URL or return to the start page.
                </Alert>

                <Box display="flex" mt={4}>
                  <LinkButton to="/" variant="contained" color="secondary" sx={{ mx: "auto" }}>
                    Go to start
                  </LinkButton>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
