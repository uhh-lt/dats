import { PromptPreview, PromptPreviewSource, PromptTemplateHooks, PromptTemplateSelector } from "@core/prompt-template";
import { PromptTemplateRead } from "@models/PromptTemplateRead";
import { PromptTemplateVersionRead } from "@models/PromptTemplateVersionRead";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback, useMemo, useState } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

/** Selects the prompt template version to run; the version decides everything but the documents and the model. */
export function TemplateSelectionStep() {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const sdocIds = useAppSelector((state) => state.llmAssistant.documentIds);
  const savedVersionId = useAppSelector((state) => state.llmAssistant.promptTemplateVersionId);
  const dispatch = useAppDispatch();

  // local state: the selected version
  const [versionId, setVersionId] = useState<number | undefined>(savedVersionId);
  const selected = PromptTemplateHooks.useGetPromptTemplateVersion({ projectId, versionId });
  const handleChangeVersion = useCallback(
    (selection: { template: PromptTemplateRead; version: PromptTemplateVersionRead } | undefined) => {
      setVersionId(selection?.version.id);
    },
    [],
  );
  const source = useMemo<PromptPreviewSource | undefined>(
    () => (selected.data ? { versionId: selected.data.version.id, prompt: selected.data.version.prompt } : undefined),
    [selected.data],
  );

  const handleNext = useCallback(() => {
    if (!selected.data) return;
    dispatch(
      LLMAssistantActions.goToTemplateSettings({
        promptTemplateVersionId: selected.data.version.id,
        method: selected.data.template.task_type,
      }),
    );
  }, [selected.data, dispatch]);
  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  return (
    <>
      <DialogContent sx={{ bgcolor: "grey.100" }}>
        <Stack spacing={2}>
          <LLMAssistantUtterance>
            <Typography>
              Choose the prompt I should run on the {sdocIds.length} selected document(s). The prompt decides the task,
              the codes, tags or metadata fields, the examples and the input and output format. Prompts are written on
              the Prompts page of the project.
            </Typography>
          </LLMAssistantUtterance>
          <Card variant="outlined">
            <CardHeader title="Prompt" slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
            <Divider />
            <CardContent>
              <PromptTemplateSelector projectId={projectId} versionId={versionId} onChange={handleChangeVersion} />
            </CardContent>
          </Card>
          {source && (
            <Card variant="outlined">
              <CardHeader title="Preview" slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
              <Divider />
              <CardContent sx={{ height: 480 }}>
                <PromptPreview projectId={projectId} sdocIds={sdocIds} source={source} />
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button variant="contained" startIcon={<PlayCircleIcon />} disabled={!selected.data} onClick={handleNext}>
          Next
        </Button>
      </DialogActions>
    </>
  );
}
