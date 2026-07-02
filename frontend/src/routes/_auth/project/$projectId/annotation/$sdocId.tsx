import { Icon } from "@components/icons";
import { AnnotationView, annotationViewLoader } from "@features/annotation";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const annotationSearchSchema = z.object({
  visibleUserId: z.coerce.number().optional(),
  selectedAnnotationId: z.coerce.number().optional(),
  compareWithUserId: z.coerce.number().optional(),
  explorerTab: z.enum(["code", "annotation"]).default("code"),
});

export const Route = createFileRoute("/_auth/project/$projectId/annotation/$sdocId")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION,
    getTitle: (sdoc: Awaited<ReturnType<typeof annotationViewLoader>> | undefined) =>
      `Document ${String(sdoc?.name ?? "")}`,
  },
  params: {
    parse: ({ sdocId }) => ({ sdocId: parseInt(sdocId) }),
  },
  validateSearch: zodValidator(annotationSearchSchema),
  loader: ({ context, params }) =>
    annotationViewLoader({
      queryClient: context.queryClient,
      sdocId: params.sdocId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: AnnotationView,
});
