import {
  AgreementModeSelector,
  agreementQueries,
  AgreementSegmentSummary,
  filterSegments,
  segmentFocus,
  SegmentErrorType,
  SegmentErrorTypeSelector,
  SegmentFilter,
  SENTENCE_AGREEMENT_MODES,
  SPAN_AGREEMENT_MODES,
  useAgreementSdocIds,
} from "@core/agreement";
import { useAuth } from "@core/auth";
import { CodeHooks, CodeRenderer } from "@core/code";
import { AgreementMode } from "@models/AgreementMode";
import { AgreementParams } from "@models/AgreementParams";
import { AgreementSegment } from "@models/AgreementSegment";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { AnnotationMode } from "../../../_types/AnnotationMode";
import { AnnotationRouteAPI } from "../_hooks/annotationRouteAPI";
import "./_styles/Annotation.css";

const ANY_CODE = -1;
const NO_TAG_IDS: number[] = [];

interface MismatchNavigatorProps {
  sdocId: number;
}

/**
 * Next / previous mismatch between the two compared annotators, filtered by code
 * and error type. The focused segment is stored in the URL, where the comparators
 * read it to scroll to and highlight it. Opened from the agreement analysis, the
 * navigation continues across the documents of the analysis (its tags); otherwise
 * it covers the current document.
 */
export function MismatchNavigator({ sdocId }: MismatchNavigatorProps) {
  const { user } = useAuth();
  const navigate = AnnotationRouteAPI.useNavigate();
  const projectId = AnnotationRouteAPI.useParams({ select: (params) => params.projectId });
  const {
    visibleUserId,
    compareWithUserId,
    agreementMode,
    agreementCodeIds,
    agreementTagIds,
    agreementFocusStart,
    agreementFocusEnd,
    mismatchCodeId,
    mismatchErrorType = SegmentErrorType.DISAGREEMENT,
  } = AnnotationRouteAPI.useSearch();
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);

  // the scoring mode must fit the comparator (span or sentence)
  const modes = annotationMode === AnnotationMode.SentenceAnnotation ? SENTENCE_AGREEMENT_MODES : SPAN_AGREEMENT_MODES;
  const mode = agreementMode !== undefined && modes.includes(agreementMode) ? agreementMode : modes[0];

  // compare with the codes of the URL, or with all codes of the project
  const projectCodeIds = CodeHooks.useGetAllCodesMap({ select: (codes) => Object.keys(codes).map(Number) });
  const codeIds = agreementCodeIds && agreementCodeIds.length > 0 ? agreementCodeIds : projectCodeIds.data;

  // the documents of the analysis (by tags) plus the current document
  const { sdocIds: taggedSdocIds } = useAgreementSdocIds(agreementTagIds ?? NO_TAG_IDS);
  const sdocIds = useMemo(
    () =>
      taggedSdocIds === undefined || taggedSdocIds.includes(sdocId)
        ? (taggedSdocIds ?? [sdocId])
        : [...taggedSdocIds, sdocId].sort((a, b) => a - b),
    [taggedSdocIds, sdocId],
  );

  // global server state (react query)
  const referenceUserId = visibleUserId ?? user?.id;
  const params: AgreementParams | undefined = useMemo(() => {
    if (referenceUserId === undefined || compareWithUserId === undefined || codeIds === undefined) return undefined;
    return {
      sdoc_ids: sdocIds,
      code_ids: codeIds,
      reference_user_id: referenceUserId,
      compared_user_id: compareWithUserId,
      mode,
    };
  }, [sdocIds, codeIds, referenceUserId, compareWithUserId, mode]);
  const agreement = useQuery(agreementQueries.compute(projectId, params));

  // the mismatches to navigate, ordered by document and position
  const filter: SegmentFilter = useMemo(
    () => ({ errorType: mismatchErrorType, codeId: mismatchCodeId }),
    [mismatchErrorType, mismatchCodeId],
  );
  const segments = useMemo(
    () => (agreement.data ? filterSegments(agreement.data.segments, filter) : []),
    [agreement.data, filter],
  );

  // the position of the focused segment (or of the current document) among them
  const documentIndex = (segment: AgreementSegment) => sdocIds.indexOf(segment.sdoc_id);
  const current = { document: sdocIds.indexOf(sdocId), start: agreementFocusStart ?? -1 };
  const isFocused = (segment: AgreementSegment) => {
    const { start, end } = segmentFocus(segment);
    return segment.sdoc_id === sdocId && start === agreementFocusStart && end === agreementFocusEnd;
  };
  const isAfter = (segment: AgreementSegment) =>
    documentIndex(segment) > current.document ||
    (documentIndex(segment) === current.document && segmentFocus(segment).start > current.start);
  const isBefore = (segment: AgreementSegment) =>
    documentIndex(segment) < current.document ||
    (documentIndex(segment) === current.document &&
      agreementFocusStart !== undefined &&
      segmentFocus(segment).start < current.start);
  const currentIndex = segments.findIndex(isFocused);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : segments.findIndex(isAfter);
  const previousIndex = currentIndex >= 0 ? currentIndex - 1 : segments.findLastIndex(isBefore);
  const hasNext = nextIndex >= 0 && nextIndex < segments.length;
  const hasPrevious = previousIndex >= 0;
  const currentSegment = currentIndex >= 0 ? segments[currentIndex] : undefined;
  const numDocuments = new Set(segments.map((segment) => segment.sdoc_id)).size;

  // handlers (for ui)
  const handleFocus = useCallback(
    (segment: AgreementSegment) => {
      const { start, end } = segmentFocus(segment);
      navigate({
        to: "/project/$projectId/annotation/$sdocId",
        params: { projectId, sdocId: segment.sdoc_id },
        search: (prev) => ({
          ...prev,
          agreementMode: mode,
          agreementFocusStart: start,
          agreementFocusEnd: end,
          selectedAnnotationId: undefined,
        }),
        // switching the document is a new history entry, moving within it is not
        replace: segment.sdoc_id === sdocId,
      });
    },
    [navigate, projectId, sdocId, mode],
  );

  // a filter change keeps the focus only if the focused segment still matches
  const handleFilterChange = (newFilter: SegmentFilter) => {
    const keepsFocus = currentSegment !== undefined && filterSegments([currentSegment], newFilter).length > 0;
    navigate({
      search: (prev) => ({
        ...prev,
        mismatchCodeId: newFilter.codeId,
        mismatchErrorType: newFilter.errorType,
        agreementFocusStart: keepsFocus ? prev.agreementFocusStart : undefined,
        agreementFocusEnd: keepsFocus ? prev.agreementFocusEnd : undefined,
      }),
      replace: true,
    });
  };
  const handleCodeChange = (event: SelectChangeEvent<number>) => {
    const value = Number(event.target.value);
    handleFilterChange({ ...filter, codeId: value === ANY_CODE ? undefined : value });
  };
  const handleErrorTypeChange = (errorType: SegmentErrorType) => {
    handleFilterChange({ ...filter, errorType });
  };
  const handleModeChange = (newMode: AgreementMode) => {
    navigate({
      search: (prev) => ({
        ...prev,
        agreementMode: newMode,
        agreementFocusStart: undefined,
        agreementFocusEnd: undefined,
      }),
      replace: true,
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Typography variant="subtitle1" mr={1}>
          Mismatches
        </Typography>
        <AgreementModeSelector mode={mode} onModeChange={handleModeChange} modes={modes} sx={{ minWidth: 180 }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="mismatch-code-filter-label">Code</InputLabel>
          <Select
            labelId="mismatch-code-filter-label"
            label="Code"
            value={mismatchCodeId ?? ANY_CODE}
            onChange={handleCodeChange}
          >
            <MenuItem value={ANY_CODE}>Any code</MenuItem>
            {codeIds?.map((codeId) => (
              <MenuItem key={codeId} value={codeId}>
                <CodeRenderer code={codeId} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <SegmentErrorTypeSelector
          errorType={mismatchErrorType}
          onErrorTypeChange={handleErrorTypeChange}
          sx={{ minWidth: 200 }}
        />
        <Box flexGrow={1} />
        {agreement.isFetching && <CircularProgress size={20} />}
        <Tooltip title="Previous mismatch">
          <span>
            <IconButton
              aria-label="Previous mismatch"
              onClick={() => handleFocus(segments[previousIndex])}
              disabled={!hasPrevious}
            >
              <NavigateBeforeIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={sdocIds.length > 1 ? `In ${numDocuments} of ${sdocIds.length} documents` : ""}>
          <Typography variant="body2" sx={{ minWidth: 56, textAlign: "center" }}>
            {currentIndex >= 0 ? currentIndex + 1 : "–"} / {segments.length}
          </Typography>
        </Tooltip>
        <Tooltip title="Next mismatch">
          <span>
            <IconButton aria-label="Next mismatch" onClick={() => handleFocus(segments[nextIndex])} disabled={!hasNext}>
              <NavigateNextIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {agreement.isError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {agreement.error.message}
        </Alert>
      )}
      {currentSegment && (
        <Stack mt={1} gap={0.5}>
          <Typography variant="body2" noWrap>
            “{currentSegment.text}”
          </Typography>
          <AgreementSegmentSummary segment={currentSegment} />
        </Stack>
      )}
    </Paper>
  );
}
