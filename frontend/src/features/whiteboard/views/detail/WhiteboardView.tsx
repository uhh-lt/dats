import { useSuspenseQuery } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { WhiteboardFlow } from "./_components/WhiteboardFlow";
import { WhiteboardRouteAPI } from "./_hooks/whiteboardRouteAPI";

export function WhiteboardView() {
  const { projectId, whiteboardId } = WhiteboardRouteAPI.useParams();
  const { whiteboardsByProjectOptions } = WhiteboardRouteAPI.useRouteContext();

  const { data: whiteboard } = useSuspenseQuery({
    ...whiteboardsByProjectOptions,
    select: (data) => data[whiteboardId],
  });

  return (
    <ReactFlowProvider>
      <WhiteboardFlow key={`${projectId}-${whiteboardId}`} whiteboard={whiteboard} />
    </ReactFlowProvider>
  );
}
