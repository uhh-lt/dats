import { createFileRoute } from "@tanstack/react-router";
import WhiteboardDashboard from "../../../../../features/whiteboard/views/dashboard/WhiteboardDashboard";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/")({
  component: WhiteboardDashboard,
});
