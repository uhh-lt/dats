import { WhiteboardDashboardView } from "@features/whiteboard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/")({
  component: WhiteboardDashboardView,
});
