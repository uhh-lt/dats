import { Box, CssBaseline } from "@mui/material";
import { useRef } from "react";
import { Outlet, useParams } from "react-router-dom";
import CodeCreateDialog from "../components/Code/CodeCreateDialog.tsx";
import ConfirmationDialog from "../components/ConfirmationDialog/ConfirmationDialog.tsx";
import ExporterDialog from "../components/Exporter/ExporterDialog.tsx";
import LLMDialog from "../components/LLMDialog/LLMDialog.tsx";
import MemoDialog from "../components/Memo/MemoDialog/MemoDialog.tsx";
import ProjectIdUpdater from "../components/Project/ProjectIdUpdater.tsx";
import ProjectSettingsDialog from "../components/ProjectSettings/ProjectSettingsDialog.tsx";
import SnackbarDialog from "../components/SnackbarDialog/SnackbarDialog.tsx";
import TagCreateDialog from "../components/Tag/TagCreateDialog.tsx";
import { AppBarContext } from "./AppBarContext.ts";
import BottomBar from "./BottomBar/BottomBar.tsx";
import DialMenu from "./DialMenu/DialMenu.tsx";
import "./Layout.css";
import TopBar from "./TopBar/TopBar.tsx";

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
        <ProjectIdUpdater />
        <DialMenu />
        <MemoDialog />
        <SnackbarDialog />
        <TagCreateDialog />
        <CodeCreateDialog />
        <ConfirmationDialog />
        <ExporterDialog />
        <ProjectSettingsDialog />
        <LLMDialog />
      </AppBarContext.Provider>
    );
  } else {
    return <h1>Invalid project id: {projectId}</h1>;
  }
}

export default TwoBarLayout;
