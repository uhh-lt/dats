import { ApiError } from "@api/core/ApiError";
import { SdocRenderer } from "@core/source-document";
import { LLMAssistantPromptTemplates } from "@models/LLMAssistantPromptTemplates";
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
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { llmAssistantQueries } from "../../../../api/llmAssistantQueries";
import { useTaskParameters } from "../../_hooks/useTaskParameters";

type MessageUnit = "Document" | "Sentence" | "Chunk";

/** Which part of a document one prompt contains, derived from the data tag of the user prompt. */
function getMessageUnit(prompts: LLMAssistantPromptTemplates[]): MessageUnit {
  const userPrompt = prompts[0]?.user_prompt ?? "";
  if (userPrompt.includes("<sentence>")) return "Sentence";
  if (userPrompt.includes("<chunk>")) return "Chunk";
  return "Document";
}

function getErrorMessage(error: Error): string {
  if (error instanceof ApiError && typeof error.body === "string") return error.body;
  return error.message;
}

interface PromptPreviewProps {
  prompts: LLMAssistantPromptTemplates[];
}

/** Shows the prompts the LLM receives for one sentence or chunk of a selected document. */
export function PromptPreview({ prompts }: PromptPreviewProps) {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const method = useAppSelector((state) => state.llmAssistant.method);
  const sdocIds = useAppSelector((state) => state.llmAssistant.documentIds);
  const strategy = useAppSelector((state) => state.llmAssistant.strategy);
  const strategyParams = useAppSelector((state) => state.llmAssistant.strategyParams);
  const taskParameters = useTaskParameters();

  // local state: the document and the message (sentence or chunk) to preview
  const [sdocId, setSdocId] = useState<number | undefined>(sdocIds[0]);
  const unit = getMessageUnit(prompts);
  const [messageSelection, setMessageSelection] = useState<{ unit: MessageUnit; index: number }>({
    unit,
    index: 0,
  });
  // switching between sentences, chunks and documents starts at the first message again
  const messageIndex = messageSelection.unit === unit ? messageSelection.index : 0;

  const request = useMemo(() => {
    if (!method || !strategy || !strategyParams || !taskParameters || sdocId === undefined) return undefined;
    return {
      project_id: projectId,
      task_type: method,
      specific_task_parameters: taskParameters,
      strategy_type: strategy,
      specific_strategy_parameters: strategyParams,
      prompts,
      sdoc_id: sdocId,
      message_index: messageIndex,
    };
  }, [method, strategy, strategyParams, taskParameters, sdocId, projectId, prompts, messageIndex]);
  const preview = useQuery(llmAssistantQueries.promptPreview(request));
  const numMessages = preview.data?.num_messages ?? 0;

  const handleChangeDocument = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSdocId(Number(event.target.value));
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
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          select
          fullWidth
          size="small"
          label="Document"
          value={sdocId ?? ""}
          onChange={handleChangeDocument}
          disabled={sdocIds.length === 0}
        >
          {sdocIds.map((id) => (
            <MenuItem key={id} value={id}>
              <SdocRenderer sdoc={id} renderName />
            </MenuItem>
          ))}
        </TextField>
        {preview.data && <Chip label={preview.data.language} size="small" />}
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Tooltip title={`Previous ${unit.toLowerCase()}`}>
          <span>
            <IconButton onClick={handlePreviousMessage} disabled={messageIndex === 0} size="small">
              <ChevronLeftIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="body2">
          {unit} {messageIndex + 1} of {numMessages || "?"}
        </Typography>
        <Tooltip title={`Next ${unit.toLowerCase()}`}>
          <span>
            <IconButton onClick={handleNextMessage} disabled={messageIndex + 1 >= numMessages} size="small">
              <ChevronRightIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {preview.isFetching && <LinearProgress />}
      {preview.isError && <Alert severity="error">{getErrorMessage(preview.error)}</Alert>}
      {preview.data && !preview.isError && (
        <Box sx={{ overflowY: "auto", flexGrow: 1 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="System Prompt"
              value={preview.data.system_prompt}
              multiline
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            <TextField
              fullWidth
              label="User Prompt"
              value={preview.data.user_prompt}
              multiline
              slotProps={{ htmlInput: { readOnly: true } }}
            />
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
