import { AppBar, AppBarProps, Box, Button, Grid, Link, Stack, Toolbar, Typography } from "@mui/material";
import React, { useContext } from "react";
import TemporaryDrawer from "./TemporaryDrawer";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useAuth } from "../../auth/AuthProvider";
import UserProfileMenu from "../../features/UserProfileMenu/UserProfileMenu";
import ProjectHooks from "../../api/ProjectHooks";

function TopBar(props: AppBarProps) {
  const { isLoggedIn, logout, user } = useAuth();
  const navigate = useNavigate();
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react-router)
  const { projectId } = useParams() as { projectId: string | undefined };

  // global server state (react-query)
  const project = ProjectHooks.useGetProject(projectId ? parseInt(projectId) : undefined);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppBar position="static" sx={{ zIndex: (theme) => theme.zIndex.appBar }} {...props}>
      <Toolbar disableGutters>
        <Grid container>
          <Grid item xs={2} sx={{ pl: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", height: "100%" }}>
              <TemporaryDrawer />
              <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                {isLoggedIn ? (
                  <Link href="/projects" color="inherit" underline="none">
                    DWTS
                  </Link>
                ) : (
                  "DWTS"
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
              {!isLoggedIn ? (
                <Button color="inherit" component={RouterLink} to="/login">
                  Login
                </Button>
              ) : (
                <UserProfileMenu handleLogout={handleLogout} user={user.data!} />
              )}
            </Stack>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;
