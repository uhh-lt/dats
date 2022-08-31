import React from "react";
import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import SnackbarDialog from "../features/snackbar/SnackbarDialog";
import TopBar from "../components/bar-top/TopBar";

function OneBarLayout() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Box className="myFlexContainer" sx={{ height: "100vh" }}>
        <TopBar className="myFlexFitContentContainer" />
        <Box className="myFlexFillAllContainer" sx={{ overflowY: "hidden" }}>
          <Outlet />
        </Box>
      </Box>
      <SnackbarDialog />
    </React.Fragment>
  );
}

export default OneBarLayout;
