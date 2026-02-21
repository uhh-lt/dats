import { createFileRoute } from "@tanstack/react-router";
import Annotation from "../../../../../features/annotation/AnnotationView.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/$sdocId")({
  params: {
    parse: ({ sdocId }) => ({ sdocId: parseInt(sdocId) }),
  },
  component: Annotation,
});
