import { CssBaseline, Stack } from "@mui/material";
import React, { memo } from "react";
import { Outlet } from "react-router-dom";
import SnackbarDialog from "../../components/SnackbarDialog/SnackbarDialog.tsx";

function NoBarLayout() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Stack
        direction="row"
        p={3}
        gap={3}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <img src="/logo1.png" alt="Logo 1" height={68}></img>
        <img src="/logo2.png" alt="Logo 2" height={68}></img>
      </Stack>
      <Outlet />
      <SnackbarDialog />
    </React.Fragment>
  );
}

export default memo(NoBarLayout);
