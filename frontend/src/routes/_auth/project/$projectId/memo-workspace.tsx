import { Icon } from "@components/icons";
import { MemoWorkspaceView } from "@features/memo-workspace";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/memo-workspace")({
  staticData: {
    tab: true,
    icon: Icon.LOGBOOK,
    getTitle: () => "Memo Workspace",
  },
  component: MemoWorkspaceView,
});
