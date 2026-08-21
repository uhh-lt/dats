import { Icon } from "@components/icons";
import { LogbookView } from "@features/logbook";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const logbookSearchSchema = z.object({
  memoId: z.coerce.number().positive().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/logbook")({
  staticData: {
    tab: true,
    icon: Icon.LOGBOOK,
    getTitle: () => "Logbook",
  },
  validateSearch: zodValidator(logbookSearchSchema),
  component: LogbookView,
});
