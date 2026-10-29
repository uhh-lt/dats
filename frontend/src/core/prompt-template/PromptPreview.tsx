import { DATSToolbar } from "@components/DATSToolbar";
import { SdocRenderer } from "@core/source-document";
import { DocumentUnit } from "@models/DocumentUnit";
import { PromptTemplateSnapshot } from "@models/PromptTemplateSnapshot";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, ReactNode, useCallback, useMemo, useState } from "react";
import { promptTemplateQueries } from "./api/promptTemplateQueries";
import { PromptPage } from "./PromptPage";
import { getDocumentUnit, getErrorMessage, PROMPT_TEXT_STYLE } from "./promptTemplateUtils";

/** A stored version (with its prompt text), or an unsaved draft. */
export type PromptPreviewSource = { versionId: number; prompt: string } | { draft: PromptTemplateSnapshot };

interface PromptPreviewProps {
  projectId: number;
  // the documents the user can switch between; without documents, the document block is kept as it is
  sdocIds: number[];
  source: PromptPreviewSource;
  // controls shown first in the toolbar, e.g. the selection of the documents
  toolbarStart?: ReactNode;
  // "page": a toolbar above the prompt shown as a page; "inline": compact, for dialogs
  variant?: "inline" | "page";
}

/** Shows the prompt the LLM receives for one document (or one of its sentences), rendered by the backend. */
export function PromptPreview({ projectId, sdocIds, source, toolbarStart, variant = "inline" }: PromptPreviewProps) {
  // local state: the document and, sent sentence by sentence, the sentence to preview
  const [selectedSdocId, setSelectedSdocId] = useState<number | undefined>(undefined);
  const sdocId = selectedSdocId !== undefined && sdocIds.includes(selectedSdocId) ? selectedSdocId : sdocIds[0];
  const unit = getDocumentUnit("draft" in source ? source.draft.prompt : source.prompt) ?? DocumentUnit.WHOLE;
  const isPerSentence = unit === DocumentUnit.SENTENCES;
  const [selectedSentence, setSelectedSentence] = useState(0);
  // the other units preview the first message: the whole document or its first chunk
  const messageIndex = isPerSentence ? selectedSentence : 0;

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

  const handleChangeDocument = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSelectedSdocId(Number(event.target.value));
    setSelectedSentence(0);
  }, []);
  const handlePreviousSentence = useCallback(() => setSelectedSentence((index) => Math.max(0, index - 1)), []);
  const handleNextSentence = useCallback(() => setSelectedSentence((index) => index + 1), []);

  const toolbar = (
    <>
      {toolbarStart}
      <TextField
        select
        size="small"
        value={sdocId ?? ""}
        onChange={handleChangeDocument}
        disabled={sdocIds.length === 0}
        slotProps={{ select: { displayEmpty: true } }}
        sx={{ flex: "0 1 320px", minWidth: 120 }}
      >
        {sdocIds.length === 0 ? (
          <MenuItem value="">No documents selected</MenuItem>
        ) : (
          sdocIds.map((id) => (
            <MenuItem key={id} value={id}>
              <SdocRenderer sdoc={id} renderName />
            </MenuItem>
          ))
        )}
      </TextField>
      {isPerSentence && sdocId !== undefined && (
        <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
          <Tooltip title="Previous sentence">
            <span>
              <IconButton onClick={handlePreviousSentence} disabled={messageIndex === 0} size="small">
                <ChevronLeftIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="body2">
            {numMessages === 0 && !preview.isFetching
              ? "No sentences"
              : `Sentence ${messageIndex + 1} of ${numMessages || "?"}`}
          </Typography>
          <Tooltip title="Next sentence">
            <span>
              <IconButton onClick={handleNextSentence} disabled={messageIndex + 1 >= numMessages} size="small">
                <ChevronRightIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}
      <Box sx={{ flexGrow: 1 }} />
      {preview.data && !preview.isError && (
        <Tooltip
          title={
            preview.data.is_fewshot
              ? "The prompt shows examples."
              : "The prompt shows no examples: add <examples> and select examples of the selected codes."
          }
        >
          <Chip size="small" variant="outlined" label={preview.data.is_fewshot ? "Few-shot" : "Zero-shot"} />
        </Tooltip>
      )}
    </>
  );

  const content = (
    <Stack spacing={2}>
      {preview.isFetching && <LinearProgress />}
      {preview.isError && <Alert severity="error">{getErrorMessage(preview.error)}</Alert>}
      {preview.data && !preview.isError && preview.data.unknown_placeholders.length > 0 && (
        <Alert severity="warning">
          No block fills {preview.data.unknown_placeholders.join(", ")}. The text is sent to the LLM as it is; check for
          typos.
        </Alert>
      )}
      {preview.data && !preview.isError && (
        <Typography component="div" sx={{ ...PROMPT_TEXT_STYLE, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {preview.data.prompt}
        </Typography>
      )}
    </Stack>
  );

  if (variant === "page") {
    return (
      <Box className="myFlexContainer" sx={{ flexGrow: 1, minHeight: 0 }}>
        <DATSToolbar variant="dense" sx={{ justifyContent: "flex-start" }}>
          {toolbar}
        </DATSToolbar>
        <Box className="myFlexFillAllContainer">
          <PromptPage>{content}</PromptPage>
        </Box>
      </Box>
    );
  }
  return (
    <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {toolbar}
      </Stack>
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
        {content}
      </Box>
    </Stack>
  );
}
