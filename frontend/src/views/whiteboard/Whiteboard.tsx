import { CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import WhiteboardHooks from "../../api/WhiteboardHooks.ts";
import WhiteboardFlow from "./WhiteboardFlow.tsx";

function Whiteboard() {
  // global client state
  const urlParams = useParams() as { projectId: string; whiteboardId: string };
  const projectId = parseInt(urlParams.projectId);
  const whiteboardId = parseInt(urlParams.whiteboardId);

  // global server state
  const whiteboard = WhiteboardHooks.useGetWhiteboard(whiteboardId);

  return (
    <>
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
