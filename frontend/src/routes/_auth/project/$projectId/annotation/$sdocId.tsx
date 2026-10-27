import { Icon } from "@components/icons";
import { SegmentErrorType } from "@core/agreement";
import { parseIdParam } from "@core/navigation";
import { sdocQueries } from "@core/source-document";
import { AnnotationView } from "@features/annotation";
import { AgreementMode } from "@models/AgreementMode";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const annotationSearchSchema = z.object({
  visibleUserId: z.coerce.number().optional(),
  selectedAnnotationId: z.coerce.number().optional(),
  compareWithUserId: z.coerce.number().optional(),
  explorerTab: z.enum(["code", "annotation"]).default("code"),
  // mismatch navigation in the comparison view (only set while in use): scoring mode,
  // codes (all if unset), the documents by tags (current document only if unset),
  // the focused segment (tokens [start, end) or sentences [start, end]) and the filters
  agreementMode: z.nativeEnum(AgreementMode).optional(),
  agreementCodeIds: z.array(z.coerce.number()).optional(),
  agreementTagIds: z.array(z.coerce.number()).optional(),
  agreementFocusStart: z.coerce.number().optional(),
  agreementFocusEnd: z.coerce.number().optional(),
  mismatchCodeId: z.coerce.number().optional(),
  mismatchErrorType: z.nativeEnum(SegmentErrorType).optional(),
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
    parse: ({ sdocId }) => ({ sdocId: parseIdParam(sdocId) }),
  },
  validateSearch: zodValidator(annotationSearchSchema),
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
