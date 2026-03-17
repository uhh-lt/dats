import { AnnotationView } from "@features/annotation";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/$sdocId")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION,
    getTitle: (_, params) => `Document ${String(params?.sdocId ?? "")}`,
  },
  params: {
    parse: ({ sdocId }) => ({ sdocId: parseInt(sdocId) }),
  },
  validateSearch: (search) => ({
    visibleUserId: typeof search?.visibleUserId === "number" ? search.visibleUserId : undefined,
    selectedAnnotationId: typeof search?.selectedAnnotationId === "number" ? search.selectedAnnotationId : undefined,
    compareWithUserId: typeof search?.compareWithUserId === "number" ? search.compareWithUserId : undefined,
  }),
  component: AnnotationView,
});
