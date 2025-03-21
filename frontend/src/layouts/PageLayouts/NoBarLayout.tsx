import { CssBaseline } from "@mui/material";
import React, { memo } from "react";
import { Outlet } from "react-router-dom";
import SnackbarDialog from "../../components/SnackbarDialog/SnackbarDialog.tsx";

function NoBarLayout() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Outlet />
      <SnackbarDialog />
    </React.Fragment>
  );
}

export default memo(NoBarLayout);
