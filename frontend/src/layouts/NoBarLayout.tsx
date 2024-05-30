import { CssBaseline } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import SnackbarDialog from "../features/SnackbarDialog/SnackbarDialog.tsx";

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
