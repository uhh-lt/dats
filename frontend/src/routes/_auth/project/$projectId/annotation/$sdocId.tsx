import { Icon } from "@components/icons";
import { sdocQueries } from "@core/source-document";
import { AnnotationView } from "@features/annotation";
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
    getTitle: ({ queryClient, params }) => {
      const sdoc = queryClient.getQueryData(sdocQueries.byId(Number(params.sdocId)).queryKey);
      return `Document ${sdoc?.name ?? ""}`;
    },
  },
  params: {
    parse: ({ sdocId }) => ({ sdocId: parseInt(sdocId) }),
  },
  validateSearch: zodValidator(annotationSearchSchema),
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({
    sdocDetailOptions: sdocQueries.byId(params.sdocId),
    sdocDataOptions: sdocQueries.data(params.sdocId),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.sdocDetailOptions),
      context.queryClient.ensureQueryData(context.sdocDataOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: AnnotationView,
});
