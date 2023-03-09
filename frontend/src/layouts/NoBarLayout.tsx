import React from "react";
import { CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import SnackbarDialog from "../features/Snackbar/SnackbarDialog";

function NoBarLayout() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Outlet />
      <SnackbarDialog />
    </React.Fragment>
  );
}

export default NoBarLayout;
