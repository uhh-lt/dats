import { Box, CssBaseline } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "../components/NavBarTop/TopBar.tsx";
import ConfirmationDialog from "../features/ConfirmationDialog/ConfirmationDialog.tsx";
import DialMenu from "../features/DialMenu/DialMenu.tsx";
import SnackbarDialog from "../features/Snackbar/SnackbarDialog.tsx";

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
