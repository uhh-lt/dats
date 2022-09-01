import React from "react";
import { Box, CssBaseline } from "@mui/material";
import { Outlet, useParams } from "react-router-dom";
import MemoDialog from "../features/memo-dialog/MemoDialog";
import ImportDocumentDialog from "../features/document-import/ImportDocumentDialog";
import SnackbarDialog from "../features/snackbar/SnackbarDialog";
import TagCreationDialog from "../views/search/Tags/TagCreate/TagCreationDialog";
import BottomBar from "../components/bar-bottom/BottomBar";
import TopBar from "../components/bar-top/TopBar";
import "./Layout.css";

export const AppBarContext = React.createContext<React.MutableRefObject<any> | null>(null);

function TwoBarLayout() {
  const { projectId } = useParams() as { projectId: string };

  // search bar container
  const container = React.useRef(null);

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
          <MemoDialog />
          <ImportDocumentDialog />
          <SnackbarDialog />
          <TagCreationDialog />
        </AppBarContext.Provider>
      </React.Fragment>
    );
  } else {
    return <h1>Invalid project id: {projectId}</h1>;
  }
}

export default TwoBarLayout;
