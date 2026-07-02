import { LLMHooks } from "@api/hooks/LLMHooks";
import { CodeRenderer } from "@core/code";
import { ApproachType } from "@models/ApproachType";
import { TaskType } from "@models/TaskType";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ChangeEvent, Fragment, memo, useCallback, useMemo, useState } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMUtterance } from "./LLMUtterance";

enum DeletionStrategy {
  DELETE_EXISTING = "DELETE_EXISTING",
  KEEP_EXISTING = "KEEP_EXISTING",
}

const explanations: Record<ApproachType, string> = {
  [ApproachType.LLM_ZERO_SHOT]:
    "Zero-shot learning is a type of machine learning that is used to compute results based on a prompt without any examples.",
  [ApproachType.LLM_FEW_SHOT]:
    "Few-shot learning is a type of machine learning that is used to compute results based on a prompt with a few examples. Hence, labeled examples are needed.",
};

export const ApproachSelectionStep = memo(() => {
  // available LLMs for the model selection
  const availableLLMs = LLMHooks.useGetAvailableLLMs();

  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.llmProjectId);
  const approachRecommendation = useAppSelector((state) => state.llmAssistant.llmApproachRecommendation);
  const llmId = useAppSelector((state) => state.llmAssistant.llmId);
  const llmMethod = useAppSelector((state) => state.llmAssistant.llmMethod);
  const metadata = useAppSelector((state) => state.llmAssistant.llmMetadata);
  const codes = useAppSelector((state) => state.llmAssistant.llmCodes);
  const tags = useAppSelector((state) => state.llmAssistant.llmTags);
  const sdocIds = useAppSelector((state) => state.llmAssistant.llmDocumentIds);
  const dispatch = useAppDispatch();

  // local state
  const [modelId, setModelId] = useState<string>(llmId);
  const [approachType, setApproachType] = useState(approachRecommendation.recommended_approach);
  const [deleteExistingAnnotations, setDeleteExistingAnnotations] = useState(DeletionStrategy.DELETE_EXISTING);

  // memoized handlers
  const handleChange = useCallback((event: SelectChangeEvent) => {
    setApproachType(event.target.value as ApproachType);
  }, []);

  const handleChangeModelId = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setModelId(event.target.value);
  }, []);

  const handleChangeDeletionStrategy = useCallback((event: SelectChangeEvent) => {
    setDeleteExistingAnnotations(event.target.value as DeletionStrategy);
  }, []);

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousLLMDialogStep());
  }, [dispatch]);

  // memoized values
  const codeIds = useMemo(() => codes.map((code) => code.id), [codes]);

  // deletion strategy
  const existingAssistantAnnotations = LLMHooks.useCountExistingAssistantAnnotations({
    taskType: llmMethod,
    approachType,
    sdocIds,
    codeIds,
  });

  const hasExistingAnnotations = useMemo(
    () =>
      existingAssistantAnnotations.isSuccess &&
      Object.values(existingAssistantAnnotations.data).some((count) => count > 0),
    [existingAssistantAnnotations.data, existingAssistantAnnotations.isSuccess],
  );

  // mutations
  const { mutate: createPromptTemplatesMutation, isPending: isPTPending } = LLMHooks.useCreatePromptTemplates();

  const handleNext = useCallback(() => {
    if (!llmMethod) return;
    if (!modelId) return;

    const commonParams = {
      llm_job_type: llmMethod,
      project_id: projectId,
      specific_task_parameters: {
        llm_job_type: llmMethod,
        tag_ids: tags.map((tag) => tag.id),
        project_metadata_ids: metadata.map((m) => m.id),
        code_ids: codeIds,
        sdoc_ids: sdocIds,
      },
    };

    switch (approachType) {
      case ApproachType.LLM_ZERO_SHOT:
      case ApproachType.LLM_FEW_SHOT:
        createPromptTemplatesMutation(
          {
            approachType: approachType,
            requestBody: {
              llm_job_params: commonParams,
            },
          },
          {
            onSuccess(data) {
              dispatch(
                LLMAssistantActions.llmDialogGoToPromptEditor({
                  prompts: data,
                  approach: approachType,
                  deleteExistingAnnotations: deleteExistingAnnotations === DeletionStrategy.DELETE_EXISTING,
                  modelId: modelId,
                }),
              );
            },
          },
        );
        break;
    }
  }, [
    llmMethod,
    projectId,
    tags,
    metadata,
    codeIds,
    sdocIds,
    approachType,
    createPromptTemplatesMutation,
    dispatch,
    deleteExistingAnnotations,
    modelId,
  ]);

  const numAvailableApproaches = useMemo(
    () => Object.values(approachRecommendation.available_approaches).filter((available) => available).length,
    [approachRecommendation.available_approaches],
  );

  return (
    <>
      <DialogContent>
        <TextField select value={modelId} label="Model" onChange={handleChangeModelId} sx={{ ml: 12.5, my: 2 }}>
          {availableLLMs.isError ? (
            <MenuItem value="default" disabled>
              Error loading models (using default)
            </MenuItem>
          ) : availableLLMs.isLoading ? (
            <MenuItem value="default" disabled>
              Loading models...
            </MenuItem>
          ) : availableLLMs.isSuccess ? (
            availableLLMs.data.map((model, idx) => (
              <MenuItem key={model} value={idx === 0 ? "default" : model}>
                {model} {idx === 0 ? "(default)" : ""}
              </MenuItem>
            ))
          ) : (
            <MenuItem value="default">Default</MenuItem>
          )}
        </TextField>
        <LLMUtterance>
          <Typography>
            {approachRecommendation.reasoning.split("\n").map((utterance, idx) => (
              <Fragment key={idx}>
                {utterance}
                <br />
              </Fragment>
            ))}
            {numAvailableApproaches > 1 ? " You can change the approach if you want." : ""}
          </Typography>
        </LLMUtterance>
        <FormControl sx={{ ml: 12.5, my: 2 }}>
          <InputLabel id="approach-selection-label">Approach</InputLabel>
          <Select
            labelId="approach-selection-label"
            id="approach-selection"
            value={approachType}
            label="Approach"
            onChange={handleChange}
          >
            {Object.values(ApproachType).map((approach) => (
              <MenuItem
                key={approach}
                value={approach}
                disabled={!approachRecommendation.available_approaches[approach.valueOf()]}
              >
                {approach}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <LLMUtterance>
          <Typography>{explanations[approachType as ApproachType]}</Typography>
        </LLMUtterance>
        {llmMethod === TaskType.SENTENCE_ANNOTATION && existingAssistantAnnotations.data && hasExistingAnnotations && (
          <>
            <Divider sx={{ my: 2 }} />
            <LLMUtterance>
              <Typography>
                <b>Warning!</b> I noticed that I already annotated the documents you selected. I checked the number of
                my annotations for each code and found:
              </Typography>
              {Object.entries(existingAssistantAnnotations.data).map(([code, count]) => (
                <Stack direction="row" key={code}>
                  <CodeRenderer code={parseInt(code)} />: {count}
                </Stack>
              ))}
              <Typography>How should we deal with my existing annotations?</Typography>
            </LLMUtterance>
            <FormControl sx={{ ml: 12.5, my: 2 }}>
              <InputLabel id="deletion-strategy">Deletion</InputLabel>
              <Select
                labelId="deletion-strategy"
                id="deletion-strategy"
                value={deleteExistingAnnotations}
                label="Delete"
                onChange={handleChangeDeletionStrategy}
              >
                <MenuItem value={DeletionStrategy.DELETE_EXISTING}>Delete existing annotations</MenuItem>
                <MenuItem value={DeletionStrategy.KEEP_EXISTING}>Keep existing annotations</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Box flexGrow={1} />
        <Button disabled={isPTPending} onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={isPTPending}
          loadingPosition="start"
          onClick={handleNext}
        >
          Next!
        </Button>
      </DialogActions>
    </>
  );
});
