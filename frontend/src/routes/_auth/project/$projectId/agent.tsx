import { Icon } from "@components/icons";
import { AgentView } from "@features/agent";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/agent")({
  staticData: {
    tab: true,
    icon: Icon.AGENT,
    getTitle: () => "Agent",
  },
  component: AgentView,
});
