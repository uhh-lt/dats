import {
  AnnotatedSentence,
  BlockContent,
  computeSentenceAnnotationLanes,
  computeSpanAnnotationMaps,
  SentAnnoMap,
  TagStyle,
  useTokenData,
} from "@core/annotation";
import { CodeMap } from "@core/code";
import { useTabNavigate } from "@core/navigation";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { AgreementSegment } from "@models/AgreementSegment";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Alert, Box, Button, CircularProgress, Stack, SxProps, Theme } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { memo, useMemo } from "react";
import { useSnippetData } from "../../_hooks/useSnippetData";
import { segmentAnnotations, sentenceSnippetRange, SnippetRange, spanSnippetHtml } from "../../_utils/snippetUtils";
import { SegmentBadges } from "./SegmentBadges";

// the snippets show every code pill inline and hide no code, independent of the annotator's settings
const NO_HIDDEN_CODES: number[] = [];

interface AgreementSnippetProps {
  segment: AgreementSegment;
  annotationType: AgreementAnnotationType;
  referenceUserId: number;
  comparedUserId: number;
  codeMap: CodeMap;
}

/**
 * One list row of the mismatch finder: the annotations of the segment in their context (the
 * paragraph for span annotations, one sentence before and after for sentence annotations),
 * rendered like in the annotation comparison: the reference annotator on the left, the compared
 * annotator on the right. Only the annotations of the segment are shown.
 */
export const AgreementSnippet = memo(
  ({ segment, annotationType, referenceUserId, comparedUserId, codeMap }: AgreementSnippetProps) => {
    const sdocId = segment.sdoc_id;
    const reference = useSnippetData(sdocId, annotationType, referenceUserId);
    const compared = useSnippetData(sdocId, annotationType, comparedUserId);

    // only the annotations of the segment are shown
    const referenceSpans = useMemo(
      () => segmentAnnotations(reference.spanAnnotations, segment.reference_annotation_ids),
      [reference.spanAnnotations, segment.reference_annotation_ids],
    );
    const comparedSpans = useMemo(
      () => segmentAnnotations(compared.spanAnnotations, segment.compared_annotation_ids),
      [compared.spanAnnotations, segment.compared_annotation_ids],
    );
    const referenceSentences = useMemo(
      () => segmentAnnotations(reference.sentenceAnnotations, segment.reference_annotation_ids),
      [reference.sentenceAnnotations, segment.reference_annotation_ids],
    );
    const comparedSentences = useMemo(
      () => segmentAnnotations(compared.sentenceAnnotations, segment.compared_annotation_ids),
      [compared.sentenceAnnotations, segment.compared_annotation_ids],
    );

    const error = reference.error ?? compared.error;
    if (error) {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          {error.message}
        </Alert>
      );
    }
    const sdocData = reference.sdocData;
    if (!sdocData || reference.isLoading || compared.isLoading) {
      return (
        <Box px={2} py={1}>
          <CircularProgress size={20} />
        </Box>
      );
    }

    return (
      <Stack px={2} py={1.5} gap={1} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" gap={1} alignItems="flex-start">
          <Box flexGrow={1}>
            <SegmentBadges segment={segment} />
          </Box>
          <OpenInAnnotatorButton
            segment={segment}
            annotationType={annotationType}
            referenceUserId={referenceUserId}
            comparedUserId={comparedUserId}
          />
        </Stack>
        {annotationType === AgreementAnnotationType.SPAN ? (
          <SpanComparison
            segment={segment}
            sdocData={sdocData}
            referenceAnnotations={referenceSpans}
            comparedAnnotations={comparedSpans}
          />
        ) : (
          <SentenceComparison
            segment={segment}
            sdocData={sdocData}
            referenceAnnotations={referenceSentences}
            comparedAnnotations={comparedSentences}
            codeMap={codeMap}
          />
        )}
      </Stack>
    );
  },
);

interface ComparisonProps<T> {
  segment: AgreementSegment;
  sdocData: SourceDocumentDataRead;
  referenceAnnotations: T[];
  comparedAnnotations: T[];
}

/** The paragraph of the segment twice, each with the span annotations of one annotator (as in BlockComparisonRow). */
function SpanComparison({
  segment,
  sdocData,
  referenceAnnotations,
  comparedAnnotations,
}: ComparisonProps<SpanAnnotationRead>) {
  const blocks = useMemo(
    () => spanSnippetHtml(segment, sdocData, [...referenceAnnotations, ...comparedAnnotations]),
    [segment, sdocData, referenceAnnotations, comparedAnnotations],
  );
  return (
    <Stack direction="row">
      <SpanSide blocks={blocks} sdocData={sdocData} annotations={referenceAnnotations} sx={{ pr: 2 }} />
      <SpanSide
        blocks={blocks}
        sdocData={sdocData}
        annotations={comparedAnnotations}
        sx={{ pl: 2, borderLeft: 1, borderColor: "divider" }}
      />
    </Stack>
  );
}

interface SpanSideProps {
  blocks: string[];
  sdocData: SourceDocumentDataRead;
  annotations: SpanAnnotationRead[];
  sx?: SxProps<Theme>;
}

function SpanSide({ blocks, sdocData, annotations, sx }: SpanSideProps) {
  const projectId = useAppSelector((state) => state.project.projectId);
  const tokenData = useTokenData(sdocData);
  const { annotationMap, annotationsPerToken } = useMemo(() => computeSpanAnnotationMaps(annotations), [annotations]);
  if (!projectId) return null;
  return (
    <Stack flexGrow={1} flexBasis={0} minWidth={0} gap={1} sx={sx}>
      {blocks.map((html, index) => (
        <Box key={index} display="flex" flexWrap="wrap" alignItems="baseline">
          <BlockContent
            html={html}
            tokenData={tokenData}
            annotationsPerToken={annotationsPerToken}
            annotationMap={annotationMap}
            hiddenCodeIds={NO_HIDDEN_CODES}
            tagStyle={TagStyle.Inline}
            projectId={projectId}
          />
        </Box>
      ))}
    </Stack>
  );
}

/** The sentences of the segment and one around it, each with the sentence annotations of both annotators (as in the sentence annotation comparison). */
function SentenceComparison({
  segment,
  sdocData,
  referenceAnnotations,
  comparedAnnotations,
  codeMap,
}: ComparisonProps<SentenceAnnotationRead> & { codeMap: CodeMap }) {
  const range = useMemo(
    () => sentenceSnippetRange(segment, sdocData, [...referenceAnnotations, ...comparedAnnotations]),
    [segment, sdocData, referenceAnnotations, comparedAnnotations],
  );
  const reference = useSentenceLanes(referenceAnnotations, range);
  const compared = useSentenceLanes(comparedAnnotations, range);
  const numSentenceDigits = String(sdocData.sentences.length).length;

  const sentenceIds = Array.from({ length: range.last - range.first + 1 }, (_, i) => range.first + i);
  return (
    <Box>
      {sentenceIds.map((sentenceId) => (
        <Stack key={sentenceId} direction="row" width="100%">
          <AnnotatedSentence
            sentenceId={sentenceId}
            sentence={sdocData.sentences[sentenceId]}
            numSentenceDigits={numSentenceDigits}
            annotationPositions={reference.annotationPositions[sentenceId]}
            numPositions={reference.numPositions}
            sentAnnoMap={reference.sentAnnoMaps[sentenceId]}
            codeMap={codeMap}
          />
          <AnnotatedSentence
            sentenceId={sentenceId}
            sentence={sdocData.sentences[sentenceId]}
            numSentenceDigits={numSentenceDigits}
            annotationPositions={compared.annotationPositions[sentenceId]}
            numPositions={compared.numPositions}
            sentAnnoMap={compared.sentAnnoMaps[sentenceId]}
            codeMap={codeMap}
          />
        </Stack>
      ))}
    </Box>
  );
}

/** The annotations of every sentence of the range and their lanes. */
function useSentenceLanes(annotations: SentenceAnnotationRead[], range: SnippetRange) {
  return useMemo(() => {
    const bySentence = Array.from({ length: range.last + 1 }, (_, sentenceId) =>
      annotations.filter(
        (annotation) => annotation.sentence_id_start <= sentenceId && sentenceId <= annotation.sentence_id_end,
      ),
    );
    const sentAnnoMaps: SentAnnoMap[] = bySentence.map((sentenceAnnotations) =>
      Object.fromEntries(sentenceAnnotations.map((annotation) => [annotation.id, annotation])),
    );
    return { ...computeSentenceAnnotationLanes(bySentence), sentAnnoMaps };
  }, [annotations, range]);
}

interface OpenInAnnotatorButtonProps {
  segment: AgreementSegment;
  annotationType: AgreementAnnotationType;
  referenceUserId: number;
  comparedUserId: number;
}

/** Opens the comparison of both annotators in the annotator at the segment, to edit the annotations there. */
function OpenInAnnotatorButton({
  segment,
  annotationType,
  referenceUserId,
  comparedUserId,
}: OpenInAnnotatorButtonProps) {
  const projectId = useAppSelector((state) => state.project.projectId);
  const tabNavigate = useTabNavigate();

  const handleClick = () => {
    if (!projectId) return;
    tabNavigate({
      to: "/project/$projectId/annotation/$sdocId",
      params: { projectId, sdocId: segment.sdoc_id },
      search: {
        visibleUserId: referenceUserId,
        compareWithUserId: comparedUserId,
        selectedAnnotationId: segment.reference_annotation_ids[0] ?? segment.compared_annotation_ids[0],
        annotationMode: annotationType === AgreementAnnotationType.SPAN ? "span" : "sentence",
      },
    });
  };

  return (
    <Button size="small" startIcon={<OpenInNewIcon />} onClick={handleClick} sx={{ flexShrink: 0 }}>
      Open in annotator
    </Button>
  );
}
