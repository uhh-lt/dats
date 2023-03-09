import React, { useRef } from "react";
import { Box, CssBaseline } from "@mui/material";
import { Outlet, useParams } from "react-router-dom";
import MemoDialog from "../features/Memo/MemoDialog";
import SnackbarDialog from "../features/Snackbar/SnackbarDialog";
import TagCreationDialog from "../views/search/Tags/TagCreate/TagCreationDialog";
import BottomBar from "../components/NavBarBottom/BottomBar";
import TopBar from "../components/NavBarTop/TopBar";
import "./Layout.css";
import FloatingFeedbackButton from "../features/FeedbackButton/FloatingFeedbackButton";
import ConfirmationDialog from "../features/ConfirmationDialog/ConfirmationDialog";
import ExporterDialog from "../features/Exporter/ExporterDialog";

export const AppBarContext = React.createContext<React.MutableRefObject<any> | null>(null);

function TwoBarLayout() {
  const { projectId } = useParams() as { projectId: string };

  // search bar container
  const container = useRef(null);

  if (parseInt(projectId)) {
    return (
      <React.Fragment>
        <AppBarContext.Provider value={container}>
          <CssBaseline />
          <Box className="myFlexContainer" sx={{ height: "100vh" }}>
            <TopBar className="myFlexFitContentContainer" />
            <Box className="myFlexFillAllContainer" sx={{ overflowY: "hidden" }}>
              <Outlet />
            </Box>
            <BottomBar sx={{ flex: "0 1 0" }} />
          </Box>
          <FloatingFeedbackButton />
          <MemoDialog />
          <SnackbarDialog />
          <TagCreationDialog />
          <ConfirmationDialog />
          <ExporterDialog />
        </AppBarContext.Provider>
      </React.Fragment>
    );
  } else {
    return <h1>Invalid project id: {projectId}</h1>;
  }
}

export default TwoBarLayout;
