import { WhiteboardHooks } from "@api/hooks/WhiteboardHooks";
import { CircularProgress } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { ReactFlowProvider } from "reactflow";
import { WhiteboardFlow } from "../../_components/WhiteboardFlow";

const routeApi = getRouteApi("/_auth/project/$projectId/whiteboard/$whiteboardId");

export function WhiteboardView() {
  // global client state
  const { projectId, whiteboardId } = routeApi.useParams();

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
