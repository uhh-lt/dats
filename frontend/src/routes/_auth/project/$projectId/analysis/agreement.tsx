import { Icon } from "@components/icons";
import { SegmentErrorType } from "@core/agreement";
import { AgreementAnalysisView } from "@features/agreement-analysis";
import { AgreementMode } from "@models/AgreementMode";
import { createFileRoute } from "@tanstack/react-router";
import { searchParamBooleanValidator } from "@utils/searchParamValidators";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const agreementSearchSchema = z.object({
  referenceUserId: z.coerce.number().optional(),
  comparedUserId: z.coerce.number().optional(),
  mode: z.nativeEnum(AgreementMode).default(AgreementMode.SPAN_WORD),
  tagIds: z.array(z.coerce.number()).default([]),
  codeIds: z.array(z.coerce.number()).default([]),
  // opt-in: hide the codes that no annotator used from scores and confusion matrix
  hideUnusedCodes: searchParamBooleanValidator({ default: false }),
  // the selected confusion matrix cell (-1 = no code)
  cellReferenceCodeId: z.coerce.number().optional(),
  cellComparedCodeId: z.coerce.number().optional(),
  // the filters of the segment list
  errorType: z.nativeEnum(SegmentErrorType).default(SegmentErrorType.DISAGREEMENT),
  filterCodeId: z.coerce.number().optional(),
  filterSdocId: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/analysis/agreement")({
  staticData: {
    tab: true,
    icon: Icon.AGREEMENT,
    getTitle: () => "Annotator Agreement",
  },
  validateSearch: zodValidator(agreementSearchSchema),
  component: AgreementAnalysisView,
});
