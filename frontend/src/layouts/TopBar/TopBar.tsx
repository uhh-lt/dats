import { AppBar, AppBarProps, Box, Button, Grid2, Stack, Toolbar, Typography } from "@mui/material";
import { useContext } from "react";
import { Link, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { LoginStatus } from "../../auth/LoginStatus.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { AppBarContext } from "../TwoBarLayout.tsx";
import TemporaryDrawer from "./TemporaryDrawer.tsx";
import UserProfileMenu from "./UserProfileMenu.tsx";

function TopBar(props: AppBarProps) {
  const { loginStatus, logout, user } = useAuth();
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react-router)
  const { projectId } = useParams() as { projectId: string | undefined };

  // global server state (react-query)
  const project = ProjectHooks.useGetProject(projectId ? parseInt(projectId) : undefined);

  return (
    <AppBar position="static" sx={{ zIndex: (theme) => theme.zIndex.appBar }} {...props}>
      <Toolbar disableGutters>
        <Grid2 container width="100%">
          <Grid2 size={{ xs: 2 }} sx={{ pl: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", height: "100%" }}>
              <TemporaryDrawer />
              <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                {loginStatus === LoginStatus.LOGGED_IN ? (
                  <Link
                    to="/projects"
                    style={{
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    DATS
                  </Link>
                ) : (
                  "DATS"
                )}
              </Typography>
            </Stack>
          </Grid2>
          <Grid2 size={{ xs: 10 }} sx={{ pr: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", height: "48px" }}>
              {appBarContainerRef ? (
                <Box sx={{ flexGrow: 1 }} ref={appBarContainerRef} />
              ) : (
                <Box sx={{ flexGrow: 1 }} />
              )}
              {project.isSuccess && (
                <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" }, mr: 2 }}>
                  Project: {project.data?.title}
                </Typography>
              )}
              {loginStatus === LoginStatus.LOGGED_OUT ? (
                <Button color="inherit" component={Link} to="/login">
                  Login
                </Button>
              ) : (
                <UserProfileMenu handleLogout={logout} user={user} />
              )}
            </Stack>
          </Grid2>
        </Grid2>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;
