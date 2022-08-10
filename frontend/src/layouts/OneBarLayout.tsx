import React from "react";
import { CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import SnackbarDialog from "../features/snackbar/SnackbarDialog";
import TopBar from "../components/bar-top/TopBar";

function OneBarLayout() {
  return (
    <React.Fragment>
      <CssBaseline />
      <TopBar />
      <Outlet />
      <SnackbarDialog />
    </React.Fragment>
  );
}

export default OneBarLayout;
