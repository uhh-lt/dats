import { Box, CssBaseline } from "@mui/material";
import React, { useRef } from "react";
import { Outlet, useParams } from "react-router-dom";
import BottomBar from "../components/NavBarBottom/BottomBar.tsx";
import TopBar from "../components/NavBarTop/TopBar.tsx";
import ConfirmationDialog from "../features/ConfirmationDialog/ConfirmationDialog.tsx";
import CodeCreateDialog from "../features/CrudDialog/Code/CodeCreateDialog.tsx";
import TagCreateDialog from "../features/CrudDialog/Tag/TagCreateDialog.tsx";
import DialMenu from "../features/DialMenu/DialMenu.tsx";
import ExporterDialog from "../features/Exporter/ExporterDialog.tsx";
import MemoDialog from "../features/Memo/MemoDialog.tsx";
import SnackbarDialog from "../features/Snackbar/SnackbarDialog.tsx";
import "./Layout.css";

export const AppBarContext = React.createContext<React.MutableRefObject<HTMLDivElement | null> | null>(null);

function TwoBarLayout() {
  const { projectId } = useParams() as { projectId: string };

  // search bar container
  const container = useRef<HTMLDivElement | null>(null);

  if (parseInt(projectId)) {
    return (
      <AppBarContext.Provider value={container}>
        <CssBaseline />
        <Box className="myFlexContainer" sx={{ height: "100vh" }}>
          <TopBar className="myFlexFitContentContainer" />
          <Box className="myFlexFillAllContainer" sx={{ overflowY: "hidden" }}>
            <Outlet />
          </Box>
          <BottomBar sx={{ flex: "0 1 0" }} />
        </Box>
        <DialMenu />
        <MemoDialog />
        <SnackbarDialog />
        <TagCreateDialog />
        <CodeCreateDialog />
        <ConfirmationDialog />
        <ExporterDialog />
      </AppBarContext.Provider>
    );
  } else {
    return <h1>Invalid project id: {projectId}</h1>;
  }
}

export default TwoBarLayout;
