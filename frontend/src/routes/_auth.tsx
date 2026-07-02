/* eslint-disable boundaries/element-types */
// This is a special route that does not render a feature. The functionality is directly implemented in this file. Hence, it needs access across boundaries.
import { RouteErrorPanel } from "@components/error";
import { LinkButton, SideBar, TabBar, TabSynchronizer } from "@core/navigation";
import { useDebounce } from "@hooks/useDebounce";
import { Box, Button, Container, LinearProgress, Typography } from "@mui/material";
import { ProjectActions } from "@store/global/projectSlice";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import {
  createFileRoute,
  type ErrorComponentProps,
  Outlet,
  redirect,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          // Use the current location to power a redirect after login
          redirect: location.href,
        },
      });
    }
  },
  component: AuthRouteLayout,
  errorComponent: AuthRouteErrorBoundary,
  notFoundComponent: AuthRouteNotFound,
});

export function AuthRouteFrame({
  children,
  projectId,
  showRouteProgress = false,
}: {
  children: React.ReactNode;
  projectId?: number;
  showRouteProgress?: boolean;
}) {
  const [isExpanded, setSidebarExpanded] = useState(false);
  const handleToggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => !prev);
  }, []);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "grey.200",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {showRouteProgress && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1301,
            pointerEvents: "none",
          }}
        >
          <LinearProgress variant="indeterminate" color="secondary" sx={{ height: 4 }} />
        </Box>
      )}
      <Box sx={{ height: "100%", display: "flex", flexDirection: "row" }}>
        <SideBar isExpanded={isExpanded} onToggle={handleToggleSidebar} projectId={projectId} />
        <Box
          sx={{
            height: "100%",
            width: isExpanded ? "calc(100vw - 200px)" : "calc(100vw - 49px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TabSynchronizer />
          {projectId && <TabBar projectId={projectId} />}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "auto",
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function AuthRouteLayout() {
  const { projectId } = useParams({ strict: false });
  const isRouteTransitioning = useRouterState({ select: (state) => state.status === "pending" });
  const isRouteTransitioningDebounced = useDebounce(isRouteTransitioning, 300);

  // project id updater: sets current project id in the global state
  // global client state
  const currentProjectId = useAppSelector((state) => state.project.projectId);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (currentProjectId !== projectId) {
      dispatch(ProjectActions.changeProject(projectId));
    }
  }, [currentProjectId, dispatch, projectId]);

  return (
    <AuthRouteFrame projectId={projectId} showRouteProgress={isRouteTransitioningDebounced}>
      <Outlet />
    </AuthRouteFrame>
  );
}

function AuthRouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  const { projectId } = useParams({ strict: false });

  return (
    <AuthRouteFrame projectId={projectId}>
      <Box sx={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
          <RouteErrorPanel
            title="The requested workspace view failed to load"
            description="Navigation is still available. You can retry this route or continue with another project page."
            error={error}
            actions={
              <>
                <Button variant="contained" color="secondary" onClick={reset}>
                  Retry route
                </Button>
                <LinkButton to="/projects" variant="outlined" color="secondary">
                  Open projects
                </LinkButton>
              </>
            }
          />
        </Container>
      </Box>
    </AuthRouteFrame>
  );
}

function AuthRouteNotFound() {
  const { projectId } = useParams({ strict: false });

  return (
    <AuthRouteFrame projectId={projectId}>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: { xs: 3, md: 4 },
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h4" gutterBottom>
            Page not found in this workspace
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The requested route does not exist for the current project.
          </Typography>
          <Box display="flex" gap={1.5} flexWrap="wrap">
            <LinkButton to="/projects" variant="contained" color="secondary">
              Return to projects
            </LinkButton>
            {projectId && (
              <LinkButton to="/project/$projectId/search" params={{ projectId }} variant="outlined" color="secondary">
                Open project search
              </LinkButton>
            )}
          </Box>
        </Box>
      </Container>
    </AuthRouteFrame>
  );
}
