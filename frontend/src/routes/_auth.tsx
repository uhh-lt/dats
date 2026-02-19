import { Box } from "@mui/material";
import { createFileRoute, Outlet, redirect, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LoginStatus } from "../auth/LoginStatus.ts";
import SideBar from "../layouts/SideBar/SideBar.tsx";
import TabBar from "../layouts/TabBar/TabBar.tsx";

import { ProjectActions } from "../components/Project/projectSlice.ts";
import "../layouts/Layout.css";
import { useAppDispatch, useAppSelector } from "../plugins/ReduxHooks.ts";
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    if (context.auth.loginStatus === LoginStatus.LOGGED_OUT) {
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
    <>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "row", backgroundColor: "grey.200" }}>
        <SideBar isExpanded={isExpanded} onToggle={handleToggleSidebar} projectId={projectId} />
        <Box
          sx={{
            height: "100%",
            width: isExpanded ? "calc(100vw - 200px)" : "calc(100vw - 49px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
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
    </>
  );
}
