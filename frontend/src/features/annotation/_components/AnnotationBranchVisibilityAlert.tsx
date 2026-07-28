import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { DocType } from "@models/DocType";
import { Alert, Button } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { AnnotationRouteAPI } from "../_hooks/annotationRouteAPI";
import { AnnotationMode } from "../_types/AnnotationMode";
import { AnnoActions } from "../store/annoSlice";

interface AnnotationBranchVisibilityAlertProps {
  sdocId: number;
  docType: DocType;
  annotationMode: AnnotationMode;
}

export function AnnotationBranchVisibilityAlert({
  sdocId,
  docType,
  annotationMode,
}: AnnotationBranchVisibilityAlertProps) {
  const dispatch = useAppDispatch();
  const { visibleUserId, compareWithUserId } = AnnotationRouteAPI.useSearch();
  const selectedBranchId = CodeHooks.useSelectedCodeBranchId();
  const showExternalAnnotations = useAppSelector((state) => state.annotations.showExternalAnnotations ?? false);

  const showSentenceAnnotations = annotationMode === AnnotationMode.SentenceAnnotation;
  const showBBoxAnnotations = annotationMode === AnnotationMode.Annotation && docType === DocType.IMAGE;
  const showSpanAnnotations = annotationMode === AnnotationMode.Annotation && docType !== DocType.IMAGE;

  const spanAnnotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocId, visibleUserId, showSpanAnnotations);
  const comparedSpanAnnotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(
    sdocId,
    compareWithUserId,
    showSpanAnnotations,
  );
  const sentenceAnnotations = SentenceAnnotationHooks.useGetSentenceAnnotator(
    sdocId,
    visibleUserId,
    showSentenceAnnotations,
  );
  const comparedSentenceAnnotations = SentenceAnnotationHooks.useGetSentenceAnnotator(
    sdocId,
    compareWithUserId,
    showSentenceAnnotations,
  );
  const bboxAnnotations = BboxAnnotationHooks.useGetBBoxAnnotationsBatch(sdocId, visibleUserId, showBBoxAnnotations);

  const externalAnnotationCount = showSpanAnnotations
    ? spanAnnotations.externalCount + comparedSpanAnnotations.externalCount
    : showSentenceAnnotations
      ? sentenceAnnotations.externalCount + comparedSentenceAnnotations.externalCount
      : showBBoxAnnotations
        ? bboxAnnotations.externalCount
        : 0;

  if (externalAnnotationCount === 0) return null;

  const handleToggle = () => {
    dispatch(AnnoActions.toggleExternalAnnotations());
  };

  return (
    <Alert
      severity="info"
      action={
        <Button color="inherit" size="small" onClick={handleToggle}>
          {showExternalAnnotations ? "Hide them" : "Show them"}
        </Button>
      }
      sx={{ borderRadius: 0 }}
    >
      {externalAnnotationCount} {externalAnnotationCount === 1 ? "annotation uses" : "annotations use"} codes outside{" "}
      {selectedBranchId === null ? "Main" : "this branch"}
    </Alert>
  );
}
