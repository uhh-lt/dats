import { CircularProgress, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import WhiteboardHooks from "../../api/WhiteboardHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import EditableTypography from "../../components/EditableTypography.tsx";
import { AppBarContext } from "../../layouts/AppBarContext.ts";
import WhiteboardFlow from "./WhiteboardFlow.tsx";

function Whiteboard() {
  // global client state
  const { user } = useAuth();
  const appBarContainerRef = useContext(AppBarContext);
  const urlParams = useParams() as { projectId: string; whiteboardId: string };
  const projectId = parseInt(urlParams.projectId);
  const whiteboardId = parseInt(urlParams.whiteboardId);

  // global server state
  const updateWhiteboardMutation = WhiteboardHooks.useUpdateWhiteboard();
  const whiteboard = WhiteboardHooks.useGetWhiteboard(whiteboardId);

  const readonly = whiteboard.data?.user_id !== user?.id;

  const handleChange = (value: string) => {
    if (!whiteboard.data || whiteboard.data.title === value) return;

    updateWhiteboardMutation.mutate({
      whiteboardId: whiteboard.data.id,
      requestBody: {
        title: value,
        content: JSON.stringify(whiteboard.data.content),
      },
    });
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        {readonly ? (
          <Typography variant="h6">{whiteboard.data?.title} - READONLY</Typography>
        ) : (
          <EditableTypography
            value={whiteboard.data?.title || "Loading"}
            onChange={handleChange}
            variant="h6"
            whiteColor={true}
          />
        )}
      </Portal>
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
