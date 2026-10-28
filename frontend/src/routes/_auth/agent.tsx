import { AgentView } from "@features/agent";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/agent")({
  component: AgentView,
});
