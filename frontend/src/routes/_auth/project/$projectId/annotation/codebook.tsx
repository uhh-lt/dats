import { Icon } from "@components/icons";
import { CodebookChangesView } from "@features/annotation/views/codebook/CodebookChangesView";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/codebook")({
  staticData: { tab: true, icon: Icon.CODE, getTitle: () => "Codebook Changes" },
  component: CodebookChangesRoute,
});

function CodebookChangesRoute() {
  const { projectId } = Route.useParams();
  return <CodebookChangesView projectId={projectId} />;
}
