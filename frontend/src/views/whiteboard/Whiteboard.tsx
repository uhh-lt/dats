import { CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import WhiteboardHooks from "../../api/WhiteboardHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import WhiteboardFlow from "./WhiteboardFlow.tsx";

function Whiteboard() {
  // global client state
  const { user } = useAuth();
  const urlParams = useParams() as { projectId: string; whiteboardId: string };
  const projectId = parseInt(urlParams.projectId);
  const whiteboardId = parseInt(urlParams.whiteboardId);

  // global server state
  const whiteboard = WhiteboardHooks.useGetWhiteboard(whiteboardId);

  const readonly = whiteboard.data?.user_id !== user?.id;

  return (
    <>
      {whiteboard.isSuccess ? (
        <ReactFlowProvider>
          <WhiteboardFlow key={`${projectId}-${whiteboardId}`} whiteboard={whiteboard.data} readonly={readonly} />
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
