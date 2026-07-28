import { Icon } from "@components/icons";
import { AnnotationDashboardView } from "@features/annotation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION,
    getTitle: () => "Annotation",
  },
  component: AnnotationDashboardRoute,
});

function AnnotationDashboardRoute() {
  const { projectId } = Route.useParams();
  return <AnnotationDashboardView projectId={projectId} />;
}
