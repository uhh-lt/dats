import { CodeHooks } from "@api/hooks/CodeHooks";
import { SdocRenderer } from "@core/source-document";
import { AnnotationResult } from "@models/AnnotationResult";
import { SentenceAnnotationResult } from "@models/SentenceAnnotationResult";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Stack, Typography } from "@mui/material";
import { useMemo } from "react";

interface AnnotationResultSummaryProps {
  results: (AnnotationResult | SentenceAnnotationResult)[];
  /** e.g. "sentences" or "text passages" — used in the summary message */
  annotationWording: string;
}

export function AnnotationResultSummary({ results, annotationWording }: AnnotationResultSummaryProps) {
  const stats = useMemo(() => {
    const annotatedResults = results.filter((r) => r.suggested_annotations.length > 0);
    return {
      numDocuments: results.length,
      numAnnotatedDocuments: annotatedResults.length,
      numAnnotations: results.reduce((sum, r) => sum + r.suggested_annotations.length, 0),
      numErrors: results.filter((r) => r.status === "error").length,
      numPartial: results.filter((r) => r.status === "partial").length,
      firstAnnotatedSdocId: annotatedResults[0]?.sdoc_id,
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

      <Box>
        {results.map((result) => (
          <DocumentResultAccordion key={result.sdoc_id} result={result} />
        ))}
      </Box>
    </Stack>
  );
}

function DocumentResultAccordion({ result }: { result: AnnotationResult | SentenceAnnotationResult }) {
  const isError = result.status === "error";
  const isPartial = result.status === "partial";
  const hasAnnotations = result.suggested_annotations.length > 0;

  const chipLabel = isError
    ? "Error"
    : isPartial
      ? `${result.suggested_annotations.length} annotations (partial)`
      : hasAnnotations
        ? `${result.suggested_annotations.length} annotations`
        : "No annotations";
  const chipColor = isError ? "error" : isPartial ? "warning" : hasAnnotations ? "success" : "default";

  return (
    <Accordion disableGutters elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
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
}

function SuggestedAnnotationsInfo({ result }: { result: AnnotationResult | SentenceAnnotationResult }) {
  const codes = CodeHooks.useGetAllCodesMap();

  const codeId2count = useMemo(() => {
    const map = new Map<number, number>();
    for (const annotation of result.suggested_annotations) {
      map.set(annotation.code_id, (map.get(annotation.code_id) ?? 0) + 1);
    }
    return map;
  }, [result.suggested_annotations]);

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {[...codeId2count.entries()].map(([codeId, count]) => (
        <Chip key={codeId} label={`${codes.data?.[codeId]?.name ?? `Code ${codeId}`} (${count})`} size="small" />
      ))}
    </Stack>
  );
}
