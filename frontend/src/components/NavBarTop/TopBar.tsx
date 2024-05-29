import { AppBar, AppBarProps, Box, Button, Grid, Link, Stack, Toolbar, Typography } from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { LoginStatus } from "../../auth/LoginStatus.ts";
import { useAuth } from "../../auth/useAuth.ts";
import UserProfileMenu from "../../features/UserProfileMenu/UserProfileMenu.tsx";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import TemporaryDrawer from "./TemporaryDrawer.tsx";

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
        <Grid container>
          <Grid item xs={2} sx={{ pl: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", height: "100%" }}>
              <TemporaryDrawer />
              <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                {loginStatus === LoginStatus.LOGGED_IN ? (
                  <Link href="/projects" color="inherit" underline="none">
                    DATS
                  </Link>
                ) : (
                  "DATS"
                )}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={10} sx={{ pr: 3 }}>
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
                <Button color="inherit" component={RouterLink} to="/login">
                  Login
                </Button>
              ) : (
                <UserProfileMenu handleLogout={logout} user={user} />
              )}
            </Stack>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;
