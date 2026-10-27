import { Icon } from "@components/icons";
import { AgreementAnalysisView } from "@features/agreement-analysis";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { AgreementScoring } from "@models/AgreementScoring";
import { createFileRoute } from "@tanstack/react-router";
import { searchParamBooleanValidator } from "@utils/searchParamValidators";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const agreementSearchSchema = z.object({
  referenceUserId: z.coerce.number().optional(),
  comparedUserId: z.coerce.number().optional(),
  annotationType: z.nativeEnum(AgreementAnnotationType).default(AgreementAnnotationType.SPAN),
  scoring: z.nativeEnum(AgreementScoring).default(AgreementScoring.CONSTITUENTS),
  tagIds: z.array(z.coerce.number()).default([]),
  codeIds: z.array(z.coerce.number()).default([]),
  // opt-in: hide the codes that no annotator used from scores and confusion matrix
  hideUnusedCodes: searchParamBooleanValidator({ default: false }),
  // the selected confusion matrix cell (-1 = no code)
  cellReferenceCodeId: z.coerce.number().optional(),
  cellComparedCodeId: z.coerce.number().optional(),
  // the filters of the segment list (errorType: which segments to show, see SegmentErrorType)
  errorType: z
    .enum(["disagreement", "false_negative", "false_positive", "confusion", "agreement", "all"])
    .default("disagreement"),
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
