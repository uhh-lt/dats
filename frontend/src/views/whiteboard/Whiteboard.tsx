import { CircularProgress, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import WhiteboardFlow from "./WhiteboardFlow";
import { ReactFlowProvider } from "reactflow";
import WhiteboardHooks from "../../api/WhiteboardHooks";
import { useParams } from "react-router-dom";

function Whiteboard() {
  // global client state
  const appBarContainerRef = useContext(AppBarContext);
  const urlParams = useParams() as { projectId: string; whiteboardId: string };
  const projectId = parseInt(urlParams.projectId);
  const whiteboardId = parseInt(urlParams.whiteboardId);

  // global server state
  const whiteboard = WhiteboardHooks.useGetWhiteboard(whiteboardId);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Whiteboard: {whiteboard.data?.title}
        </Typography>
      </Portal>
      {whiteboard.isSuccess ? (
        <ReactFlowProvider>
          <WhiteboardFlow key={`${projectId}-${whiteboardId}`} whiteboard={whiteboard.data} />
        </ReactFlowProvider>
      ) : whiteboard.isLoading ? (
        <CircularProgress />
      ) : whiteboard.isError ? (
        <div>ERROR: {whiteboard.error.message}</div>
      ) : null}
    </>
  );
}

export default Whiteboard;
