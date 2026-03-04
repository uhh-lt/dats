import { LogbookView } from "@features/logbook";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/logbook")({
  component: LogbookView,
});
