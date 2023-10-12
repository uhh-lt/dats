import React from "react";
import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import SnackbarDialog from "../features/Snackbar/SnackbarDialog";
import TopBar from "../components/NavBarTop/TopBar";
import ConfirmationDialog from "../features/ConfirmationDialog/ConfirmationDialog";
import DialMenu from "../features/DialMenu/DialMenu";

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
      <DialMenu />
      <SnackbarDialog />
      <ConfirmationDialog />
    </React.Fragment>
  );
}

export default OneBarLayout;
