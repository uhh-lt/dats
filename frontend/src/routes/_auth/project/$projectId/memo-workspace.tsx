import { Icon } from "@components/icons";
import { MemoWorkspaceView } from "@features/memo-workspace";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const memoWorkspaceSearchSchema = z.object({
  memoId: z.coerce.number().positive().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/memo-workspace")({
  staticData: {
    tab: true,
    icon: Icon.LOGBOOK,
    getTitle: () => "Memo Workspace",
  },
  validateSearch: zodValidator(memoWorkspaceSearchSchema),
  component: MemoWorkspaceView,
});
