import { Icon } from "@core/navigation";
import { AnnotationView } from "@features/annotation";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const annotationSearchSchema = z.object({
  visibleUserId: z.number().optional(),
  selectedAnnotationId: z.number().optional(),
  compareWithUserId: z.number().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/annotation/$sdocId")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION,
    getTitle: (_, params) => `Document ${String(params?.sdocId ?? "")}`,
  },
  params: {
    parse: ({ sdocId }) => ({ sdocId: parseInt(sdocId) }),
  },
  validateSearch: zodValidator(annotationSearchSchema),
  component: AnnotationView,
});
