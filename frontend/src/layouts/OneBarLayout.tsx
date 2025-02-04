import { Box, CssBaseline } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import ConfirmationDialog from "../components/ConfirmationDialog/ConfirmationDialog.tsx";
import ProjectIdUpdater from "../components/Project/ProjectIdUpdater.tsx";
import SnackbarDialog from "../components/SnackbarDialog/SnackbarDialog.tsx";
import DialMenu from "./DialMenu/DialMenu.tsx";
import TopBar from "./TopBar/TopBar.tsx";

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
      <ProjectIdUpdater />
      <DialMenu />
      <SnackbarDialog />
      <ConfirmationDialog />
    </React.Fragment>
  );
}

export default OneBarLayout;
