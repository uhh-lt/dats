import { CodeRenderer } from "@core/code";
import {
  DEFAULT_OUTPUT_FORMATS,
  getErrorMessage,
  LANGUAGE_LABELS,
  PromptPreview,
  PromptTemplateHooks,
  promptTemplateQueries,
  TASK_TYPE_LABELS,
} from "@core/prompt-template";
import { AnnotateAsChoice, AnnotateAsSelector, suggestVirtualUserName, UserHooks } from "@core/user";
import { TaskType } from "@models/TaskType";
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
  const language = useAppSelector((state) => state.llmAssistant.language);
  const outputFormat = useAppSelector((state) => state.llmAssistant.outputFormat);
  const versionId = useAppSelector((state) => state.llmAssistant.promptTemplateVersionId);
  const dispatch = useAppDispatch();

  // the name of the prompt: the selected version, or the default prompt of the guided path and its copy in the project
  const templateVersion = PromptTemplateHooks.useGetPromptTemplateVersion({ projectId, versionId });
  const taskInfo = useQuery({ ...promptTemplateQueries.taskInfo(method), enabled: mode === "guided" });
  const format = outputFormat ?? (method ? DEFAULT_OUTPUT_FORMATS[method] : undefined);
  const formatInfo = taskInfo.data?.output_formats.find((info) => info.output_format === format);
  const defaultPromptName = formatInfo?.default_prompt_names[language];

  // the prompt
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

  // annotation tasks write into a virtual user: an existing one or a new one (default: the next free LLM-Run<n>)
  const isAnnotationTask = method === TaskType.ANNOTATION || method === TaskType.SENTENCE_ANNOTATION;
  const virtualUsers = UserHooks.useGetVirtualUsers();
  const [annotateAsChoice, setAnnotateAsChoice] = useState<AnnotateAsChoice | null | undefined>(undefined);
  const annotateAs = useMemo<AnnotateAsChoice | null>(() => {
    if (annotateAsChoice !== undefined) return annotateAsChoice;
    if (!virtualUsers.data) return null;
    return { newName: suggestVirtualUserName("LLM", virtualUsers.data) };
  }, [annotateAsChoice, virtualUsers.data]);
  const virtualUserId = annotateAs && "userId" in annotateAs ? annotateAs.userId : undefined;

  // existing annotations of the virtual user the job writes into
  const [deletionStrategy, setDeletionStrategy] = useState(DeletionStrategy.DELETE_EXISTING);
  const handleChangeDeletionStrategy = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = Object.values(DeletionStrategy).find((candidate) => candidate === event.target.value);
    if (value) setDeletionStrategy(value);
  }, []);
  const existingAnnotations = LlmAssistantHooks.useGetExistingAnnotationCount({
    taskType: method,
    virtualUserId,
    sdocIds,
    codeIds,
  });
  const existingAnnotationCounts = useMemo(
    () => Object.entries(existingAnnotations.data ?? {}).filter(([, count]) => count > 0),
    [existingAnnotations.data],
  );
  const deleteExistingAnnotations =
    existingAnnotationCounts.length > 0 && deletionStrategy === DeletionStrategy.DELETE_EXISTING;

  // start the job, after creating the new virtual user to annotate as
  const { mutate: startLLMAssistantJobMutation, isPending: isStartPending } =
    LlmAssistantHooks.useStartLLMAssistantJob();
  const { mutate: createVirtualUserMutation, isPending: isCreatePending } = UserHooks.useCreateVirtualUser();
  const isPending = isStartPending || isCreatePending;
  const startJob = useCallback(
    (virtualUserId: number | null) => {
      if (!method || !source) return;
      startLLMAssistantJobMutation(
        {
          requestBody: {
            project_id: projectId,
            task_type: method,
            sdoc_ids: sdocIds,
            model: modelId,
            ...("draft" in source ? { draft: source.draft } : { prompt_template_version_id: source.versionId }),
            virtual_user_id: virtualUserId,
            delete_existing_annotations: deleteExistingAnnotations,
          },
        },
        {
          onSuccess: (job) => {
            dispatch(LLMAssistantActions.goToWaiting({ jobId: job.job_id, deleteExistingAnnotations }));
          },
        },
      );
    },
    [method, source, projectId, sdocIds, modelId, deleteExistingAnnotations, startLLMAssistantJobMutation, dispatch],
  );
  const handleStart = useCallback(() => {
    if (!isAnnotationTask) return startJob(null);
    if (!annotateAs) return;
    if ("userId" in annotateAs) return startJob(annotateAs.userId);
    createVirtualUserMutation(
      { projectId, requestBody: { name: annotateAs.newName } },
      { onSuccess: (virtualUser) => startJob(virtualUser.id) },
    );
  }, [isAnnotationTask, annotateAs, projectId, startJob, createVirtualUserMutation]);

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  return (
    <>
      <DialogContent sx={{ bgcolor: "grey.100" }}>
        <Stack spacing={2}>
          <LLMAssistantUtterance>
            {mode === "template" ? (
              <Typography>
                This is the prompt <b>{templateVersion.data?.template.name ?? "…"}</b>
                {templateVersion.data ? ` (version ${templateVersion.data.version.version})` : ""}, exactly as I will
                receive it for each document. You can edit it on the Prompts page.
              </Typography>
            ) : (
              <Typography>
                This is the built-in default prompt for {method ? TASK_TYPE_LABELS[method] : "the task"} (
                {formatInfo ? `${formatInfo.name.toLowerCase()}, ` : ""}
                {LANGUAGE_LABELS[language]}), filled with your selections, exactly as I will receive it for each
                document. Built-in prompts cannot be edited. To change the text, add examples or keep versions, edit its
                copy {defaultPromptName ? <b>{defaultPromptName}</b> : null} (or a duplicate) on the Prompts page and
                run it with <i>Prompt</i>.
              </Typography>
            )}
          </LLMAssistantUtterance>
          {isAnnotationTask && (
            <Card variant="outlined">
              <CardHeader title="Annotate as" slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
              <Divider />
              <CardContent>
                <Stack spacing={2}>
                  <Typography>
                    I write my annotations into a virtual user, never into your annotations. Choose a new one to keep
                    this run apart from earlier runs, so you can compare them.
                  </Typography>
                  <AnnotateAsSelector value={annotateAs} onChange={setAnnotateAsChoice} />
                </Stack>
              </CardContent>
            </Card>
          )}
          {isError && <Alert severity="error">Could not load the prompt.</Alert>}
          {rendered.isError && <Alert severity="error">{getErrorMessage(rendered.error)}</Alert>}
          {existingAnnotations.isError && (
            <Alert severity="error">Could not check for existing annotations of the virtual user.</Alert>
          )}
          {existingAnnotationCounts.length > 0 && (
            <Card variant="outlined" sx={{ borderColor: "error.main" }}>
              <CardHeader
                title="Existing annotations"
                slotProps={{ title: { variant: "h6", color: "error.main" } }}
                sx={{ py: 1 }}
              />
              <Divider sx={{ borderColor: "error.main" }} />
              <CardContent>
                <Stack spacing={2}>
                  <Typography>
                    The virtual user already has annotations for some selected documents and codes:
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
          <Card variant="outlined">
            <CardHeader title="Preview" slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
            <Divider />
            <CardContent sx={{ height: 560 }}>
              {source && <PromptPreview projectId={projectId} sdocIds={sdocIds} source={source} />}
            </CardContent>
          </Card>
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
          disabled={
            !source ||
            rendered.isError ||
            !rendered.data ||
            existingAnnotations.isLoading ||
            (isAnnotationTask && annotateAs === null)
          }
          onClick={handleStart}
        >
          Start
        </Button>
      </DialogActions>
    </>
  );
}
