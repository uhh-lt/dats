import { AppBar, AppBarProps, Box, Button, Grid, Link, Stack, Toolbar, Typography } from "@mui/material";
import React, { useContext } from "react";
import TemporaryDrawer from "./TemporaryDrawer";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useAuth } from "../../auth/AuthProvider";
import UserProfileMenu from "../../features/user-profile-menu/UserProfileMenu";

function TopBar(props: AppBarProps) {
  const { isLoggedIn, logout, user } = useAuth();
  const navigate = useNavigate();
  const appBarContainerRef = useContext(AppBarContext);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppBar position="static" {...props}>
      <Toolbar disableGutters>
        <Grid container>
          <Grid item xs={2} sx={{ pl: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", height: "100%" }}>
              <TemporaryDrawer />
              <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                {isLoggedIn ? (
                  <Link component={RouterLink} to="/projects" underline="none" color="inherit">
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
