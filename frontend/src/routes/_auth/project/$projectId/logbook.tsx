import { createFileRoute } from "@tanstack/react-router";
import Logbook from "../../../../features/logbook/views/main/LogbookView";

export const Route = createFileRoute("/_auth/project/$projectId/logbook")({
  component: Logbook,
});
