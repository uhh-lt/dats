import { Icon } from "@components/icons";
import { AgentView } from "@features/agent";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const agentSearchSchema = z.object({
  // the open chat (agent session); none for a new chat
  sessionId: z.string().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/agent")({
  staticData: {
    tab: true,
    icon: Icon.AGENT,
    getTitle: () => "Agent",
  },
  validateSearch: zodValidator(agentSearchSchema),
  component: AgentView,
});
