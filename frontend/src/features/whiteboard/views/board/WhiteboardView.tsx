import { whiteboardQueries } from "@api/queries/whiteboardQueries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { WhiteboardFlow } from "./_components/WhiteboardFlow";
import { WhiteboardViewRouteAPI } from "./_hooks/whiteboardRouteAPI";

export function WhiteboardView() {
  const { projectId, whiteboardId } = WhiteboardViewRouteAPI.useParams();

  const { data: whiteboard } = useSuspenseQuery({
    ...whiteboardQueries.byProject(projectId),
    select: (data) => data[whiteboardId],
  });

  return (
    <ReactFlowProvider>
      <WhiteboardFlow key={`${projectId}-${whiteboardId}`} whiteboard={whiteboard} />
    </ReactFlowProvider>
  );
}
