import { SdocRenderer } from "@core/source-document";
import { DocumentUnit } from "@models/DocumentUnit";
import { PromptTemplateSnapshot } from "@models/PromptTemplateSnapshot";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Alert, Box, IconButton, LinearProgress, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { promptTemplateQueries } from "./api/promptTemplateQueries";
import { DOCUMENT_UNIT_MESSAGES, getDocumentUnit, getErrorMessage } from "./promptTemplateUtils";

/** A stored version (with its prompt text), or an unsaved draft. */
export type PromptPreviewSource = { versionId: number; prompt: string } | { draft: PromptTemplateSnapshot };

interface PromptPreviewProps {
  projectId: number;
  // the documents the user can switch between; without documents, the document block is kept as it is
  sdocIds: number[];
  source: PromptPreviewSource;
}

/** Shows the prompt the LLM receives for one document, sentence or chunk, rendered by the backend. */
export function PromptPreview({ projectId, sdocIds, source }: PromptPreviewProps) {
  // local state: the document and the message (sentence or chunk) to preview
  const [selectedSdocId, setSelectedSdocId] = useState<number | undefined>(undefined);
  const sdocId = selectedSdocId !== undefined && sdocIds.includes(selectedSdocId) ? selectedSdocId : sdocIds[0];
  const unit = getDocumentUnit("draft" in source ? source.draft.prompt : source.prompt) ?? DocumentUnit.WHOLE;
  const message = DOCUMENT_UNIT_MESSAGES[unit];
  const [messageSelection, setMessageSelection] = useState<{ unit: DocumentUnit; index: number }>({
    unit,
    index: 0,
  });
  // switching between sentences, chunks and documents starts at the first message again
  const messageIndex = messageSelection.unit === unit ? messageSelection.index : 0;

  const request = useMemo(
    () => ({
      project_id: projectId,
      ...("draft" in source ? { draft: source.draft } : { prompt_template_version_id: source.versionId }),
      sdoc_id: sdocId ?? null,
      message_index: messageIndex,
    }),
    [projectId, source, sdocId, messageIndex],
  );
  const preview = useQuery(promptTemplateQueries.preview(request));
  const numMessages = preview.data?.num_messages ?? 0;

  const handleChangeDocument = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSelectedSdocId(Number(event.target.value));
      setMessageSelection({ unit, index: 0 });
    },
    [unit],
  );
  const handlePreviousMessage = useCallback(() => {
    setMessageSelection({ unit, index: Math.max(0, messageIndex - 1) });
  }, [unit, messageIndex]);
  const handleNextMessage = useCallback(() => {
    setMessageSelection({ unit, index: messageIndex + 1 });
  }, [unit, messageIndex]);

  return (
    <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
      <TextField
        select
        fullWidth
        size="small"
        label="Document"
        value={sdocId ?? ""}
        onChange={handleChangeDocument}
        disabled={sdocIds.length === 0}
        helperText={sdocIds.length === 0 ? "Select documents to see the prompt with a document." : undefined}
      >
        {sdocIds.length === 0 ? (
          <MenuItem value="">No documents</MenuItem>
        ) : (
          sdocIds.map((id) => (
            <MenuItem key={id} value={id}>
              <SdocRenderer sdoc={id} renderName />
            </MenuItem>
          ))
        )}
      </TextField>
      {sdocId !== undefined && (
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Tooltip title={`Previous ${message.toLowerCase()}`}>
            <span>
              <IconButton onClick={handlePreviousMessage} disabled={messageIndex === 0} size="small">
                <ChevronLeftIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="body2">
            {numMessages === 0 && !preview.isFetching
              ? `This document has no ${message.toLowerCase()} to send`
              : `${message} ${messageIndex + 1} of ${numMessages || "?"} (one LLM call each)`}
          </Typography>
          <Tooltip title={`Next ${message.toLowerCase()}`}>
            <span>
              <IconButton onClick={handleNextMessage} disabled={messageIndex + 1 >= numMessages} size="small">
                <ChevronRightIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}
      {preview.isFetching && <LinearProgress />}
      {preview.isError && <Alert severity="error">{getErrorMessage(preview.error)}</Alert>}
      {preview.data && !preview.isError && preview.data.unknown_placeholders.length > 0 && (
        <Alert severity="warning">
          No block fills {preview.data.unknown_placeholders.join(", ")}. The text is sent to the LLM as it is; check for
          typos.
        </Alert>
      )}
      {preview.data && !preview.isError && (
        <Box sx={{ overflowY: "auto", flexGrow: 1 }}>
          <TextField
            fullWidth
            label={preview.data.is_fewshot ? "Prompt (few-shot)" : "Prompt (zero-shot)"}
            value={preview.data.prompt}
            multiline
            slotProps={{ htmlInput: { readOnly: true, style: { fontFamily: "monospace" } } }}
          />
        </Box>
      )}
    </Stack>
  );
}
