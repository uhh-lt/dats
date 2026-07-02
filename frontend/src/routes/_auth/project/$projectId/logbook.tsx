import { Icon } from "@components/icons";
import { LogbookView } from "@features/logbook";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/logbook")({
  staticData: {
    tab: true,
    icon: Icon.LOGBOOK,
    getTitle: () => "Logbook",
  },
  component: LogbookView,
});
