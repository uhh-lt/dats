import { CodeHooks } from "@core/code";
import { SdocRenderer } from "@core/source-document";
import { AnnotationResult } from "@models/AnnotationResult";
import { SentenceAnnotationResult } from "@models/SentenceAnnotationResult";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Stack, Typography } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, SyntheticEvent, useCallback, useMemo, useRef, useState } from "react";
import { countAnnotations } from "../_utils/annotationResultUtils";

interface AnnotationResultSummaryProps {
  results: (AnnotationResult | SentenceAnnotationResult)[];
  /** e.g. "sentences" or "text passages" — used in the summary message */
  annotationWording: string;
}

export function AnnotationResultSummary({ results, annotationWording }: AnnotationResultSummaryProps) {
  const stats = useMemo(() => {
    const annotationCounts = results.map(countAnnotations);
    return {
      numDocuments: results.length,
      numAnnotatedDocuments: annotationCounts.filter((count) => count > 0).length,
      numAnnotations: annotationCounts.reduce((sum, count) => sum + count, 0),
      numErrors: results.filter((r) => r.status === "error").length,
      numPartial: results.filter((r) => r.status === "partial").length,
    };
  }, [results]);

  return (
    <Stack spacing={2}>
      <Typography>
        {stats.numAnnotations > 0 ? (
          <>
            I annotated <b>{stats.numAnnotatedDocuments}</b> of <b>{stats.numDocuments}</b> documents with a total of{" "}
            <b>{stats.numAnnotations}</b> {annotationWording} annotations.
            {stats.numErrors > 0 && (
              <>
                {" "}
                Unfortunately, <b>{stats.numErrors}</b> {stats.numErrors === 1 ? "document" : "documents"} could not be
                processed.
              </>
            )}
            {stats.numPartial > 0 && (
              <>
                {" "}
                <b>{stats.numPartial}</b> {stats.numPartial === 1 ? "document was" : "documents were"} only partially
                processed.
              </>
            )}
          </>
        ) : (
          <>
            I processed <b>{stats.numDocuments}</b> {stats.numDocuments === 1 ? "document" : "documents"}, but could not
            create any annotations.
          </>
        )}
      </Typography>

      {stats.numAnnotations === 0 && (
        <Alert severity="warning">
          I was not able to annotate any document. Expand the documents below to inspect my raw responses — this can
          help you improve the prompt (e.g. clearer instructions, better examples) or adjust the selected codes.
        </Alert>
      )}

      {stats.numErrors > 0 && stats.numAnnotations > 0 && (
        <Alert severity="warning">
          {stats.numErrors} {stats.numErrors === 1 ? "document" : "documents"} failed to process. Expand them below to
          see the error details.
        </Alert>
      )}

      {stats.numPartial > 0 && (
        <Alert severity="warning">
          {stats.numPartial} {stats.numPartial === 1 ? "document was" : "documents were"} only partially processed —
          some annotations were created, but a few requests failed. Expand them below to see details.
        </Alert>
      )}

      <DocumentResultList results={results} />
    </Stack>
  );
}

// A run may process thousands of documents: only the visible rows are mounted (and load their document).
function DocumentResultList({ results }: { results: (AnnotationResult | SentenceAnnotationResult)[] }) {
  // the expanded rows, kept here as a row unmounts when it scrolls out of view
  const [expandedSdocIds, setExpandedSdocIds] = useState<Set<number>>(() => new Set());
  const handleToggle = useCallback((sdocId: number, expanded: boolean) => {
    setExpandedSdocIds((previous) => {
      const next = new Set(previous);
      if (expanded) next.add(sdocId);
      else next.delete(sdocId);
      return next;
    });
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    getItemKey: (index) => results[index].sdoc_id,
  });

  const items = virtualizer.getVirtualItems();
  return (
    <Box ref={parentRef} sx={{ overflowY: "auto", maxHeight: 400 }}>
      <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${items[0]?.start ?? 0}px)`,
          }}
        >
          {items.map((item) => (
            <div key={item.key} data-index={item.index} ref={virtualizer.measureElement}>
              <DocumentResultAccordion
                result={results[item.index]}
                expanded={expandedSdocIds.has(results[item.index].sdoc_id)}
                onToggle={handleToggle}
              />
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}

interface DocumentResultAccordionProps {
  result: AnnotationResult | SentenceAnnotationResult;
  expanded: boolean;
  onToggle: (sdocId: number, expanded: boolean) => void;
}

const DocumentResultAccordion = memo(({ result, expanded, onToggle }: DocumentResultAccordionProps) => {
  const isError = result.status === "error";
  const isPartial = result.status === "partial";
  const numAnnotations = countAnnotations(result);
  const hasAnnotations = numAnnotations > 0;

  const chipLabel = isError
    ? "Error"
    : isPartial
      ? `${numAnnotations} annotations (partial)`
      : hasAnnotations
        ? `${numAnnotations} annotations`
        : "No annotations";
  const chipColor = isError ? "error" : isPartial ? "warning" : hasAnnotations ? "success" : "default";

  const handleChange = (_: SyntheticEvent, isExpanded: boolean) => {
    onToggle(result.sdoc_id, isExpanded);
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={handleChange}
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={{ border: "1px solid", borderColor: "divider" }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1, pr: 1 }}>
          <SdocRenderer sdoc={result.sdoc_id} renderName link renderDoctypeIcon />
          <Box sx={{ flexGrow: 1 }} />
          <Chip label={chipLabel} color={chipColor} size="small" variant="outlined" />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Typography variant="body2" color={isError ? "error" : isPartial ? "warning.dark" : "text.secondary"}>
            {result.status_message}
          </Typography>
          {hasAnnotations && <SuggestedAnnotationsInfo result={result} />}
          {result.raw_response && (
            <>
              <Typography variant="subtitle2">Raw LLM response</Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: "grey.100",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                {result.raw_response}
              </Box>
            </>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
});
DocumentResultAccordion.displayName = "DocumentResultAccordion";

function SuggestedAnnotationsInfo({ result }: { result: AnnotationResult | SentenceAnnotationResult }) {
  const codes = CodeHooks.useGetAllCodesMap();

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {Object.entries(result.annotation_count_by_code_id).map(([codeId, count]) => (
        <Chip
          key={codeId}
          label={`${codes.data?.[Number(codeId)]?.name ?? `Code ${codeId}`} (${count})`}
          size="small"
        />
      ))}
    </Stack>
  );
}
