import { SideBar, TabBar, TabSynchronizer } from "@core/navigation";
import { Box, LinearProgress } from "@mui/material";
// eslint-disable-next-line boundaries/element-types
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
// eslint-disable-next-line boundaries/element-types
import { useDebounce } from "@hooks/useDebounce";
import { ProjectActions } from "@store/global/projectSlice";
import { createFileRoute, Outlet, redirect, useParams, useRouterState } from "@tanstack/react-router";
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
});

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

  // sidebar state
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
      {isRouteTransitioningDebounced && (
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
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
