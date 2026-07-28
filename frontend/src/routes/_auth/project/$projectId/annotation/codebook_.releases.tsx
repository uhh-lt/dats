import { Icon } from "@components/icons";
import { CodebookReleasesView } from "@features/annotation/views/codebook/releases/CodebookReleasesView";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/codebook_/releases")({
  staticData: { tab: true, icon: Icon.CODE, getTitle: () => "Codebook Releases" },
  component: CodebookReleasesRoute,
});

function CodebookReleasesRoute() {
  const { projectId } = Route.useParams();
  return <CodebookReleasesView projectId={projectId} />;
}
