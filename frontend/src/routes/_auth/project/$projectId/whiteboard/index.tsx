import { createFileRoute } from "@tanstack/react-router";
import WhiteboardDashboard from "../../../../../views/whiteboard/WhiteboardDashboard.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/")({
  component: WhiteboardDashboard,
});
