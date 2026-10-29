import { CodeRenderer } from "@core/code";
import { getErrorMessage, PromptPreview, promptTemplateQueries } from "@core/prompt-template";
import { ApproachType } from "@models/ApproachType";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  DialogActions,
  DialogContent,
  Divider,
  Grid2 as Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { LlmAssistantHooks } from "../../../api/llmAssistantHooks";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { useWizardPrompt } from "../_hooks/useWizardPrompt";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

enum DeletionStrategy {
  DELETE_EXISTING = "DELETE_EXISTING",
  KEEP_EXISTING = "KEEP_EXISTING",
}

/** Shows the prompt exactly as the LLM receives it and starts the job. */
export function ReviewStep() {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const mode = useAppSelector((state) => state.llmAssistant.mode);
  const method = useAppSelector((state) => state.llmAssistant.method);
  const sdocIds = useAppSelector((state) => state.llmAssistant.documentIds);
  const modelId = useAppSelector((state) => state.llmAssistant.modelId);
  const dispatch = useAppDispatch();

  // the prompt; a prompt that shows examples makes a few-shot run
  const { source, codeIds, isError } = useWizardPrompt();
  const rendered = useQuery(
    promptTemplateQueries.preview(
      source
        ? {
            project_id: projectId,
            ...("draft" in source ? { draft: source.draft } : { prompt_template_version_id: source.versionId }),
            sdoc_id: null,
            message_index: 0,
          }
        : undefined,
    ),
  );
  const approach = rendered.data?.is_fewshot ? ApproachType.LLM_FEW_SHOT : ApproachType.LLM_ZERO_SHOT;

  // existing annotations of the assistant user the job writes into
  const [deletionStrategy, setDeletionStrategy] = useState(DeletionStrategy.DELETE_EXISTING);
  const handleChangeDeletionStrategy = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = Object.values(DeletionStrategy).find((candidate) => candidate === event.target.value);
    if (value) setDeletionStrategy(value);
  }, []);
  const existingAnnotations = LlmAssistantHooks.useGetExistingAnnotationCount({
    taskType: method,
    approachType: approach,
    sdocIds,
    codeIds,
  });
  const existingAnnotationCounts = useMemo(
    () => Object.entries(existingAnnotations.data ?? {}).filter(([, count]) => count > 0),
    [existingAnnotations.data],
  );
  const deleteExistingAnnotations =
    existingAnnotationCounts.length > 0 && deletionStrategy === DeletionStrategy.DELETE_EXISTING;

  // start the job
  const { mutate: startLLMAssistantJobMutation, isPending } = LlmAssistantHooks.useStartLLMAssistantJob();
  const handleStart = useCallback(() => {
    if (!method || !source) return;
    startLLMAssistantJobMutation(
      {
        requestBody: {
          project_id: projectId,
          task_type: method,
          sdoc_ids: sdocIds,
          model: modelId,
          ...("draft" in source ? { draft: source.draft } : { prompt_template_version_id: source.versionId }),
          delete_existing_annotations: deleteExistingAnnotations,
        },
      },
      {
        onSuccess: (job) => {
          dispatch(LLMAssistantActions.goToWaiting({ jobId: job.job_id, deleteExistingAnnotations }));
        },
      },
    );
  }, [method, source, projectId, sdocIds, modelId, deleteExistingAnnotations, startLLMAssistantJobMutation, dispatch]);

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  return (
    <>
      <DialogContent sx={{ bgcolor: "grey.100" }}>
        <Stack spacing={2}>
          <LLMAssistantUtterance>
            <Typography>
              {mode === "template"
                ? "This is the selected prompt, exactly as I will receive it for each document. Edit it on the Prompts page."
                : "This is the prompt I will use with your selections, exactly as I will receive it for each document. For your own prompts, examples and versions, use the Prompts page."}
            </Typography>
          </LLMAssistantUtterance>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={2}>
                <Card variant="outlined">
                  <CardHeader title="Run" slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
                  <Divider />
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        {sdocIds.length} document(s), model {modelId}
                      </Typography>
                      {rendered.isError && <Alert severity="error">{getErrorMessage(rendered.error)}</Alert>}
                      {rendered.data && (
                        <Typography variant="body2" color="text.secondary">
                          {rendered.data.is_fewshot
                            ? "Few-shot: the prompt shows examples."
                            : "Zero-shot: the prompt shows no examples."}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
                {existingAnnotations.isError && (
                  <Alert severity="error">Could not check for existing assistant annotations.</Alert>
                )}
                {existingAnnotationCounts.length > 0 && (
                  <Card variant="outlined" sx={{ borderColor: "error.main" }}>
                    <CardHeader
                      title="Existing assistant annotations"
                      slotProps={{ title: { variant: "h6", color: "error.main" } }}
                      sx={{ py: 1 }}
                    />
                    <Divider sx={{ borderColor: "error.main" }} />
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography>
                          The assistant has already created annotations for some selected documents and codes:
                        </Typography>
                        <Stack spacing={1} pl={2}>
                          {existingAnnotationCounts.map(([codeId, count]) => (
                            <Stack direction="row" alignItems="center" spacing={1} key={codeId}>
                              <CodeRenderer code={Number(codeId)} />
                              <Typography>{count}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                        <TextField
                          select
                          fullWidth
                          label="Existing annotations"
                          value={deletionStrategy}
                          onChange={handleChangeDeletionStrategy}
                        >
                          <MenuItem value={DeletionStrategy.DELETE_EXISTING}>
                            Delete and replace existing annotations
                          </MenuItem>
                          <MenuItem value={DeletionStrategy.KEEP_EXISTING}>Keep existing annotations</MenuItem>
                        </TextField>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardHeader title="Preview" slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
                <Divider />
                <CardContent sx={{ height: 560 }}>
                  {isError && <Alert severity="error">Could not load the prompt.</Alert>}
                  {source && <PromptPreview projectId={projectId} sdocIds={sdocIds} source={source} />}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Box flexGrow={1} />
        <Button disabled={isPending} onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={isPending}
          loadingPosition="start"
          disabled={!source || rendered.isError || !rendered.data || existingAnnotations.isLoading}
          onClick={handleStart}
        >
          Start
        </Button>
      </DialogActions>
    </>
  );
}
