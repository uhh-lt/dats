import { CardContainer } from "@components/CardContainer";
import { getIconComponent, Icon } from "@components/icons";
import { CodeHooks, CodeRenderer, CodeSelector } from "@core/code";
import { SdocRenderer, sdocQueries } from "@core/source-document";
import { UserHooks, UserRenderer } from "@core/user";
import { useURLConnector } from "@hooks/useURLConnector";
import { AgreementResult } from "@models/AgreementResult";
import { AgreementSegment } from "@models/AgreementSegment";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import {
  Alert,
  alpha,
  Box,
  Button,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  SxProps,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQueries, UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { downloadFile } from "@utils/downloadUtils";
import { useCallback, useMemo, useRef } from "react";
import { AgreementHooks } from "../../../api/agreementHooks";
import { AgreementAnalysisRouteAPI } from "../_hooks/agreementAnalysisRouteAPI";
import { AgreementCell, filterSegments, NO_CODE, segmentsToCsv } from "../_utils/agreementUtils";
import { SegmentErrorTypeSelector } from "./SegmentErrorTypeSelector";
import { AgreementSnippet } from "./snippet/AgreementSnippet";

const combineSdocNames = (results: UseQueryResult<SourceDocumentRead>[]): Record<number, string> =>
  Object.fromEntries(results.flatMap((result) => (result.data ? [[result.data.id, result.data.name]] : [])));

// the document header rows are tinted, so that they stand out from the grey page background
const sdocHeaderSx: SxProps<Theme> = {
  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
  borderBottom: 1,
  borderColor: "divider",
};

type ListRow = { type: "sdoc"; sdocId: number; count: number } | { type: "segment"; segment: AgreementSegment };

const CodeOrNone = ({ codeId }: { codeId: number }) =>
  codeId === NO_CODE ? <i>no code</i> : <CodeRenderer code={codeId} />;

interface AgreementSegmentListProps {
  result: AgreementResult | undefined;
  codeIds: number[];
  /** The annotations changed since the result was computed. */
  isOutdated: boolean;
  onRecompute: () => void;
}

/**
 * The mismatch finder: lists the segments of the agreement result in their context, grouped by
 * document and filtered by confusion matrix cell, error type, code and document. The list is
 * read-only; the annotations are edited in the annotator.
 */
export function AgreementSegmentList({ result, codeIds, isOutdated, onRecompute }: AgreementSegmentListProps) {
  // global client state (URL)
  const projectId = AgreementAnalysisRouteAPI.useParams({ select: (params) => params.projectId });
  const navigate = AgreementAnalysisRouteAPI.useNavigate();
  const { cellReferenceCodeId, cellComparedCodeId } = AgreementAnalysisRouteAPI.useSearch();
  const [errorType, setErrorType] = useURLConnector(AgreementAnalysisRouteAPI, "errorType");
  const [filterCodeId, setFilterCodeId] = useURLConnector(AgreementAnalysisRouteAPI, "filterCodeId");
  const [filterSdocId, setFilterSdocId] = useURLConnector(AgreementAnalysisRouteAPI, "filterSdocId");
  const cell: AgreementCell | undefined = useMemo(
    () =>
      cellReferenceCodeId !== undefined && cellComparedCodeId !== undefined
        ? { referenceCodeId: cellReferenceCodeId, comparedCodeId: cellComparedCodeId }
        : undefined,
    [cellReferenceCodeId, cellComparedCodeId],
  );

  // global server state (react query)
  const codeMap = CodeHooks.useGetAllCodesMap();
  const projectUsers = UserHooks.useGetAllUsers();
  const { mutate: getSegmentTexts, isPending: isExporting } = AgreementHooks.useGetSegmentTexts();

  // filtered segments, grouped by document
  const segments = useMemo(
    () =>
      result ? filterSegments(result.segments, { errorType, codeId: filterCodeId, sdocId: filterSdocId, cell }) : [],
    [result, errorType, filterCodeId, filterSdocId, cell],
  );
  const rows = useMemo(() => {
    const rows: ListRow[] = [];
    segments.forEach((segment, index) => {
      if (index === 0 || segments[index - 1].sdoc_id !== segment.sdoc_id) {
        rows.push({
          type: "sdoc",
          sdocId: segment.sdoc_id,
          count: segments.filter((s) => s.sdoc_id === segment.sdoc_id).length,
        });
      }
      rows.push({ type: "segment", segment });
    });
    return rows;
  }, [segments]);
  const sdocIds = useMemo(() => Array.from(new Set(result?.segments.map((s) => s.sdoc_id) ?? [])), [result]);
  const sdocNames = useQueries({
    queries: sdocIds.map((sdocId) => sdocQueries.byId(sdocId)),
    combine: combineSdocNames,
  });

  // why the list is empty: no segments at all, no disagreements, or the filters
  const isUnfiltered = cell === undefined && filterCodeId === undefined && filterSdocId === undefined;
  const emptyMessage = !result
    ? ""
    : result.segments.length === 0
      ? "Neither annotator assigned one of the selected codes in these documents."
      : isUnfiltered && errorType === "disagreement"
        ? `No disagreements: the annotators agree on all ${result.segments.length} segment(s).`
        : "No segments match the filters.";

  // virtualization
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index].type === "sdoc" ? 48 : 160),
    overscan: 5,
  });

  // handlers (for ui)
  const handleClearCell = () => {
    navigate({
      search: (prev) => ({ ...prev, cellReferenceCodeId: undefined, cellComparedCodeId: undefined }),
      replace: true,
    });
  };
  const handleSdocChange = (event: SelectChangeEvent<number>) => {
    const value = Number(event.target.value);
    setFilterSdocId(value === NO_CODE ? undefined : value);
  };
  const handleExport = useCallback(() => {
    if (!result) return;
    const userName = (userId: number) => {
      const user = projectUsers.data?.find((u) => u.id === userId);
      return user ? `${user.first_name} ${user.last_name}` : "";
    };
    // the result carries no texts, so the texts of the listed segments are read for the export
    getSegmentTexts(
      {
        projectId,
        requestBody: segments.map((segment) => ({ sdoc_id: segment.sdoc_id, begin: segment.begin, end: segment.end })),
      },
      {
        onSuccess: (texts) => {
          const csv = segmentsToCsv(segments, texts, {
            annotationType: result.annotation_type,
            scoring: result.scoring,
            referenceUser: { id: result.reference_user_id, name: userName(result.reference_user_id) },
            comparedUser: { id: result.compared_user_id, name: userName(result.compared_user_id) },
            sdocNames,
            codeNames: Object.fromEntries(Object.values(codeMap.data ?? {}).map((code) => [code.id, code.name])),
          });
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          downloadFile(url, "agreement_segments.csv").finally(() => URL.revokeObjectURL(url));
        },
      },
    );
  }, [result, segments, projectId, getSegmentTexts, projectUsers.data, sdocNames, codeMap.data]);

  return (
    <Stack spacing={2} p={2} className="h100">
      <CardContainer className="myFlexFitContentContainer">
        <CardHeader
          title="Segments"
          subheader={
            result
              ? `${segments.length} of ${result.segments.length} segment(s) in ${sdocIds.length} document(s)`
              : "Select annotators, documents and codes to compare."
          }
          action={
            <Tooltip title="Export the listed segments with their annotation IDs (CSV)">
              <span>
                <IconButton
                  aria-label="Export the listed segments (CSV)"
                  onClick={handleExport}
                  disabled={segments.length === 0 || isExporting}
                >
                  {getIconComponent(Icon.EXPORT)}
                </IconButton>
              </span>
            </Tooltip>
          }
        />
        <Stack direction="row" gap={1} px={2} pb={2} flexWrap="wrap" alignItems="center">
          {cell && (
            <Chip
              label={
                <Stack direction="row" gap={0.5} alignItems="center">
                  <CodeOrNone codeId={cell.referenceCodeId} /> → <CodeOrNone codeId={cell.comparedCodeId} />
                </Stack>
              }
              onDelete={handleClearCell}
            />
          )}
          <SegmentErrorTypeSelector errorType={errorType} onErrorTypeChange={setErrorType} sx={{ minWidth: 200 }} />
          <CodeSelector
            title="Code"
            placeholder="Any code"
            selectableCodeIds={codeIds}
            value={filterCodeId}
            onChange={setFilterCodeId}
            size="small"
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="segment-sdoc-filter-label">Document</InputLabel>
            <Select
              labelId="segment-sdoc-filter-label"
              label="Document"
              value={filterSdocId ?? NO_CODE}
              onChange={handleSdocChange}
            >
              <MenuItem value={NO_CODE}>Any document</MenuItem>
              {sdocIds.map((sdocId) => (
                <MenuItem key={sdocId} value={sdocId}>
                  <SdocRenderer sdoc={sdocId} renderName />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        {isOutdated && (
          <Alert
            severity="info"
            sx={{ mx: 2, mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onRecompute}>
                Recompute
              </Button>
            }
          >
            The annotations changed since the agreement was computed.
          </Alert>
        )}
      </CardContainer>
      <CardContainer className="myFlexFillAllContainer myFlexContainer">
        {result && (
          <Box
            display="grid"
            gridTemplateColumns="1fr 1fr"
            columnGap={4}
            px={2}
            py={1}
            className="myFlexFitContentContainer"
          >
            <Stack direction="row" gap={1} alignItems="center">
              <Typography fontWeight="medium">Reference:</Typography>
              <UserRenderer user={result.reference_user_id} renderAvatar />
            </Stack>
            <Stack direction="row" gap={1} alignItems="center">
              <Typography fontWeight="medium">Compared:</Typography>
              <UserRenderer user={result.compared_user_id} renderAvatar />
            </Stack>
          </Box>
        )}
        <CardContent className="myFlexFillAllContainer" sx={{ p: 0 }}>
          <Box ref={scrollRef} className="h100" sx={{ overflowY: "auto" }}>
            {rows.length === 0 ? (
              <Typography color="textSecondary" px={2}>
                {emptyMessage}
              </Typography>
            ) : (
              <Box sx={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const row = rows[item.index];
                  return (
                    <Box
                      key={item.key}
                      data-index={item.index}
                      ref={virtualizer.measureElement}
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${item.start}px)`,
                      }}
                    >
                      {row.type === "sdoc" ? (
                        <Stack direction="row" alignItems="center" gap={1} px={2} py={1} sx={sdocHeaderSx}>
                          <SdocRenderer sdoc={row.sdocId} link renderName renderDoctypeIcon />
                          <Typography variant="body2" color="textSecondary">
                            ({row.count})
                          </Typography>
                        </Stack>
                      ) : (
                        result &&
                        codeMap.data && (
                          <AgreementSnippet
                            segment={row.segment}
                            annotationType={result.annotation_type}
                            referenceUserId={result.reference_user_id}
                            comparedUserId={result.compared_user_id}
                            codeMap={codeMap.data}
                          />
                        )
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </CardContent>
      </CardContainer>
    </Stack>
  );
}
