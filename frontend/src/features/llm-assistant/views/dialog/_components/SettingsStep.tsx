import { LLMHooks } from "@api/hooks/LLMHooks";
import { CodeRenderer } from "@core/code";
import { ApproachType } from "@models/ApproachType";
import { FuzzyGroundingStrategyParams } from "@models/FuzzyGroundingStrategyParams";
import { StrategyInfo } from "@models/StrategyInfo";
import { StrategyType } from "@models/StrategyType";
import { TaskType } from "@models/TaskType";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Collapse,
  DialogActions,
  DialogContent,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ChangeEvent, memo, useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LLMAssistantActions, LLMStrategyParams } from "../../../store/llmAssistantSlice";
import { LLMUtterance } from "./LLMUtterance";

enum DeletionStrategy {
  DELETE_EXISTING = "DELETE_EXISTING",
  KEEP_EXISTING = "KEEP_EXISTING",
}

type FuzzySettings = Required<Omit<FuzzyGroundingStrategyParams, "llm_strategy_type">>;

const fallbackFuzzySettings: FuzzySettings = {
  fuzzy_threshold: 0.85,
  context_before_chars: 64,
  context_after_chars: 64,
  chunk_size_tokens: 650,
  chunk_overlap_tokens: 100,
};

const approachLabels: Record<ApproachType, string> = {
  [ApproachType.LLM_ZERO_SHOT]: "Zero-shot",
  [ApproachType.LLM_FEW_SHOT]: "Few-shot",
};

const approachDescriptions: Record<ApproachType, string> = {
  [ApproachType.LLM_ZERO_SHOT]: "Use the prompt without labeled examples from this project.",
  [ApproachType.LLM_FEW_SHOT]: "Use selected labeled examples from this project to supplement the prompt.",
};

function getFuzzySettings(strategy: StrategyInfo): FuzzySettings {
  const defaults = strategy.default_params;
  if (!("fuzzy_threshold" in defaults)) return fallbackFuzzySettings;

  return {
    fuzzy_threshold: defaults.fuzzy_threshold ?? fallbackFuzzySettings.fuzzy_threshold,
    context_before_chars: defaults.context_before_chars ?? fallbackFuzzySettings.context_before_chars,
    context_after_chars: defaults.context_after_chars ?? fallbackFuzzySettings.context_after_chars,
    chunk_size_tokens: defaults.chunk_size_tokens ?? fallbackFuzzySettings.chunk_size_tokens,
    chunk_overlap_tokens: defaults.chunk_overlap_tokens ?? fallbackFuzzySettings.chunk_overlap_tokens,
  };
}

/** Configures the model, processing strategy, learning approach, and overwrite behavior for an LLM job. */
export const SettingsStep = memo(() => {
  const availableLLMs = LLMHooks.useGetAvailableLLMs();
  const projectId = useAppSelector((state) => state.llmAssistant.llmProjectId);
  const recommendation = useAppSelector((state) => state.llmAssistant.llmApproachRecommendation);
  const llmId = useAppSelector((state) => state.llmAssistant.llmId);
  const llmMethod = useAppSelector((state) => state.llmAssistant.llmMethod);
  const metadata = useAppSelector((state) => state.llmAssistant.llmMetadata);
  const codes = useAppSelector((state) => state.llmAssistant.llmCodes);
  const tags = useAppSelector((state) => state.llmAssistant.llmTags);
  const sdocIds = useAppSelector((state) => state.llmAssistant.llmDocumentIds);
  const savedStrategy = useAppSelector((state) => state.llmAssistant.llmStrategy);
  const savedStrategyParams = useAppSelector((state) => state.llmAssistant.llmStrategyParams);
  const savedApproach = useAppSelector((state) => state.llmAssistant.llmApproach);
  const savedDeleteExisting = useAppSelector((state) => state.llmAssistant.llmDeleteExistingAnnotations);
  const savedPrompts = useAppSelector((state) => state.llmAssistant.llmPrompts);
  const dispatch = useAppDispatch();

  const strategies = LLMHooks.useListStrategies(llmMethod);
  const [modelId, setModelId] = useState(llmId);
  const [strategyType, setStrategyType] = useState<StrategyType | undefined>(savedStrategy);
  const [approachType, setApproachType] = useState(savedApproach);
  const [deletionStrategy, setDeletionStrategy] = useState(
    savedPrompts.length === 0 || savedDeleteExisting
      ? DeletionStrategy.DELETE_EXISTING
      : DeletionStrategy.KEEP_EXISTING,
  );
  const [strategyDetailsOpen, setStrategyDetailsOpen] = useState(false);
  const [fuzzySettings, setFuzzySettings] = useState<FuzzySettings>(() => {
    if (savedStrategyParams && "fuzzy_threshold" in savedStrategyParams) {
      return {
        fuzzy_threshold: savedStrategyParams.fuzzy_threshold ?? fallbackFuzzySettings.fuzzy_threshold,
        context_before_chars: savedStrategyParams.context_before_chars ?? fallbackFuzzySettings.context_before_chars,
        context_after_chars: savedStrategyParams.context_after_chars ?? fallbackFuzzySettings.context_after_chars,
        chunk_size_tokens: savedStrategyParams.chunk_size_tokens ?? fallbackFuzzySettings.chunk_size_tokens,
        chunk_overlap_tokens: savedStrategyParams.chunk_overlap_tokens ?? fallbackFuzzySettings.chunk_overlap_tokens,
      };
    }
    return fallbackFuzzySettings;
  });

  const selectedStrategy = useMemo(
    () => strategies.data?.find((strategy) => strategy.llm_strategy_type === strategyType),
    [strategies.data, strategyType],
  );
  const codeIds = useMemo(() => codes.map((code) => code.id), [codes]);
  const isAnnotationTask = llmMethod === TaskType.ANNOTATION || llmMethod === TaskType.SENTENCE_ANNOTATION;
  const existingAnnotations = LLMHooks.useCountExistingAssistantAnnotations({
    taskType: llmMethod,
    approachType,
    sdocIds,
    codeIds,
  });
  const existingAnnotationCounts = useMemo(
    () => Object.entries(existingAnnotations.data ?? {}).filter(([, count]) => count > 0),
    [existingAnnotations.data],
  );
  const hasExistingAnnotations = existingAnnotationCounts.length > 0;

  useEffect(() => {
    if (!strategies.isSuccess || strategies.data.length === 0 || strategyType !== undefined) return;
    const defaultStrategy = strategies.data[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStrategyType(defaultStrategy.llm_strategy_type);
    setFuzzySettings(getFuzzySettings(defaultStrategy));
  }, [strategies.data, strategies.isSuccess, strategyType]);

  const fuzzySettingsAreValid =
    fuzzySettings.fuzzy_threshold >= 0 &&
    fuzzySettings.fuzzy_threshold <= 1 &&
    Number.isInteger(fuzzySettings.context_before_chars) &&
    fuzzySettings.context_before_chars >= 0 &&
    Number.isInteger(fuzzySettings.context_after_chars) &&
    fuzzySettings.context_after_chars >= 0 &&
    Number.isInteger(fuzzySettings.chunk_size_tokens) &&
    fuzzySettings.chunk_size_tokens > 0 &&
    Number.isInteger(fuzzySettings.chunk_overlap_tokens) &&
    fuzzySettings.chunk_overlap_tokens >= 0 &&
    fuzzySettings.chunk_overlap_tokens < fuzzySettings.chunk_size_tokens;

  const handleChangeModel = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setModelId(event.target.value);
  }, []);

  const handleChangeStrategy = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const strategy = strategies.data?.find((candidate) => candidate.llm_strategy_type === event.target.value);
      if (!strategy) return;
      setStrategyType(strategy.llm_strategy_type);
      setFuzzySettings(getFuzzySettings(strategy));
      setStrategyDetailsOpen(false);
    },
    [strategies.data],
  );

  const handleChangeApproach = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const approach = Object.values(ApproachType).find((candidate) => candidate === event.target.value);
    if (approach) setApproachType(approach);
  }, []);

  const handleChangeDeletionStrategy = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const strategy = Object.values(DeletionStrategy).find((candidate) => candidate === event.target.value);
    if (strategy) setDeletionStrategy(strategy);
  }, []);

  const handleChangeFuzzySetting = useCallback(
    (field: keyof FuzzySettings) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = Number(event.target.value);
      setFuzzySettings((current) => ({
        ...current,
        [field]: Number.isNaN(value) ? current[field] : value,
      }));
    },
    [],
  );

  const handleToggleStrategyDetails = useCallback(() => {
    setStrategyDetailsOpen((open) => !open);
  }, []);

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousLLMDialogStep());
  }, [dispatch]);

  const createPromptTemplates = LLMHooks.useCreatePromptTemplates();
  const handleSubmit = useCallback(() => {
    if (!llmMethod || !modelId || !strategyType || !selectedStrategy) return;

    const strategyParams: LLMStrategyParams =
      strategyType === StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING
        ? { llm_strategy_type: strategyType, ...fuzzySettings }
        : selectedStrategy.default_params;

    createPromptTemplates.mutate(
      {
        approachType,
        strategyType,
        requestBody: {
          llm_job_params: {
            llm_job_type: llmMethod,
            project_id: projectId,
            specific_task_parameters: {
              llm_job_type: llmMethod,
              tag_ids: tags.map((tag) => tag.id),
              project_metadata_ids: metadata.map((item) => item.id),
              code_ids: codeIds,
              sdoc_ids: sdocIds,
            },
          },
        },
      },
      {
        onSuccess(prompts) {
          dispatch(
            LLMAssistantActions.llmDialogGoToPromptEditor({
              prompts,
              approach: approachType,
              deleteExistingAnnotations:
                hasExistingAnnotations && deletionStrategy === DeletionStrategy.DELETE_EXISTING,
              modelId,
              strategy: strategyType,
              strategyParams,
            }),
          );
        },
      },
    );
  }, [
    approachType,
    codeIds,
    createPromptTemplates,
    deletionStrategy,
    dispatch,
    fuzzySettings,
    hasExistingAnnotations,
    llmMethod,
    metadata,
    modelId,
    projectId,
    sdocIds,
    selectedStrategy,
    strategyType,
    tags,
  ]);

  const annotationCheckPending = isAnnotationTask && !existingAnnotations.isSuccess;
  const nextDisabled =
    !modelId ||
    !strategyType ||
    !selectedStrategy ||
    availableLLMs.isError ||
    availableLLMs.data?.length === 0 ||
    strategies.isError ||
    annotationCheckPending ||
    (strategyType === StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING && !fuzzySettingsAreValid) ||
    createPromptTemplates.isPending;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="myFlexContainer myFlexFillAllContainer"
    >
      <DialogContent sx={{ bgcolor: "grey.100" }}>
        <Stack spacing={2}>
          <LLMUtterance>
            <Typography>
              Configure how I should process the selected documents. Choose a model, strategy, and approach, then adjust
              any strategy-specific settings.
            </Typography>
          </LLMUtterance>

          {(availableLLMs.isError || (availableLLMs.isSuccess && availableLLMs.data.length === 0)) && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => availableLLMs.refetch()}>
                  Retry
                </Button>
              }
            >
              Could not load any available language models.
            </Alert>
          )}
          {(strategies.isError || (strategies.isSuccess && strategies.data.length === 0)) && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => strategies.refetch()}>
                  Retry
                </Button>
              }
            >
              Could not load any processing strategies for this task.
            </Alert>
          )}

          <SettingsSection title="Required settings">
            <FormItem
              title="Language model"
              subtitle="Select the language model that should process the selected documents."
            >
              <TextField
                select
                fullWidth
                variant="filled"
                label="Model"
                value={modelId}
                disabled={availableLLMs.isLoading || availableLLMs.isError || availableLLMs.data?.length === 0}
                onChange={handleChangeModel}
              >
                {availableLLMs.isLoading ? (
                  <MenuItem value="default" disabled>
                    Loading models…
                  </MenuItem>
                ) : availableLLMs.data?.length === 0 ? (
                  <MenuItem value="default" disabled>
                    No models available
                  </MenuItem>
                ) : (
                  availableLLMs.data?.map((model, index) => (
                    <MenuItem key={model} value={index === 0 ? "default" : model}>
                      {model} {index === 0 ? "(default)" : ""}
                    </MenuItem>
                  ))
                )}
              </TextField>
            </FormItem>
            <FormItem
              title="Processing strategy"
              subtitle="Choose how the model should structure its response and map results back to the documents."
            >
              <TextField
                select
                fullWidth
                variant="filled"
                label="Strategy"
                value={strategyType ?? ""}
                disabled={strategies.isLoading || strategies.isError || strategies.data?.length === 0}
                onChange={handleChangeStrategy}
              >
                {strategies.isLoading ? (
                  <MenuItem value="" disabled>
                    Loading strategies…
                  </MenuItem>
                ) : strategies.data?.length === 0 ? (
                  <MenuItem value="" disabled>
                    No strategies available
                  </MenuItem>
                ) : (
                  strategies.data?.map((strategy) => (
                    <MenuItem key={strategy.llm_strategy_type} value={strategy.llm_strategy_type}>
                      {strategy.name}
                    </MenuItem>
                  ))
                )}
              </TextField>
            </FormItem>

            {selectedStrategy && (
              <Box sx={{ borderLeft: 3, borderColor: "primary.main", pl: 2 }}>
                <Button
                  size="small"
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        transform: strategyDetailsOpen ? "rotate(180deg)" : "none",
                        transition: "transform 200ms",
                      }}
                    />
                  }
                  onClick={handleToggleStrategyDetails}
                >
                  About {selectedStrategy.name}
                </Button>
                <Collapse in={strategyDetailsOpen}>
                  <Box className="markdown-content" sx={{ pt: 1 }}>
                    <Markdown remarkPlugins={[remarkGfm]}>{selectedStrategy.description}</Markdown>
                  </Box>
                </Collapse>
              </Box>
            )}

            <FormItem title="Learning approach" subtitle={approachDescriptions[approachType]}>
              <TextField
                select
                fullWidth
                variant="filled"
                label="Approach"
                value={approachType}
                onChange={handleChangeApproach}
              >
                {Object.values(ApproachType).map((approach) => (
                  <MenuItem key={approach} value={approach} disabled={!recommendation.available_approaches[approach]}>
                    {approachLabels[approach]}
                    {recommendation.recommended_approach === approach ? " (recommended)" : ""}
                  </MenuItem>
                ))}
              </TextField>
            </FormItem>
            <Alert severity="info" variant="outlined">
              <Typography variant="subtitle2" gutterBottom>
                Recommendation: {approachLabels[recommendation.recommended_approach]}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {recommendation.reasoning}
              </Typography>
            </Alert>
          </SettingsSection>

          {strategyType === StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING && (
            <SettingsSection title="Strategy parameters">
              <FormItem title="Fuzzy threshold" subtitle="Minimum similarity required to ground an extracted quote.">
                <TextField
                  fullWidth
                  variant="filled"
                  type="number"
                  label="Similarity"
                  value={fuzzySettings.fuzzy_threshold}
                  onChange={handleChangeFuzzySetting("fuzzy_threshold")}
                  inputProps={{ step: 0.05, min: 0, max: 1 }}
                  error={fuzzySettings.fuzzy_threshold < 0 || fuzzySettings.fuzzy_threshold > 1}
                  helperText="Enter a value between 0 and 1."
                />
              </FormItem>
              <FormItem title="Context before" subtitle="Characters of context requested before each extracted quote.">
                <TextField
                  fullWidth
                  variant="filled"
                  type="number"
                  label="Characters"
                  value={fuzzySettings.context_before_chars}
                  onChange={handleChangeFuzzySetting("context_before_chars")}
                  inputProps={{ step: 8, min: 0 }}
                  error={
                    !Number.isInteger(fuzzySettings.context_before_chars) || fuzzySettings.context_before_chars < 0
                  }
                  helperText="Enter a non-negative whole number."
                />
              </FormItem>
              <FormItem title="Context after" subtitle="Characters of context requested after each extracted quote.">
                <TextField
                  fullWidth
                  variant="filled"
                  type="number"
                  label="Characters"
                  value={fuzzySettings.context_after_chars}
                  onChange={handleChangeFuzzySetting("context_after_chars")}
                  inputProps={{ step: 8, min: 0 }}
                  error={!Number.isInteger(fuzzySettings.context_after_chars) || fuzzySettings.context_after_chars < 0}
                  helperText="Enter a non-negative whole number."
                />
              </FormItem>
              <FormItem title="Chunk size" subtitle="Maximum number of tokens sent to the model in one chunk.">
                <TextField
                  fullWidth
                  variant="filled"
                  type="number"
                  label="Tokens"
                  value={fuzzySettings.chunk_size_tokens}
                  onChange={handleChangeFuzzySetting("chunk_size_tokens")}
                  inputProps={{ step: 1, min: 1 }}
                  error={!Number.isInteger(fuzzySettings.chunk_size_tokens) || fuzzySettings.chunk_size_tokens <= 0}
                  helperText="Enter a positive whole number."
                />
              </FormItem>
              <FormItem
                title="Chunk overlap"
                subtitle="Tokens repeated between adjacent chunks to preserve surrounding context."
              >
                <TextField
                  fullWidth
                  variant="filled"
                  type="number"
                  label="Tokens"
                  value={fuzzySettings.chunk_overlap_tokens}
                  onChange={handleChangeFuzzySetting("chunk_overlap_tokens")}
                  inputProps={{ step: 10, min: 0 }}
                  error={
                    !Number.isInteger(fuzzySettings.chunk_overlap_tokens) ||
                    fuzzySettings.chunk_overlap_tokens < 0 ||
                    fuzzySettings.chunk_overlap_tokens >= fuzzySettings.chunk_size_tokens
                  }
                  helperText="Must be a whole number smaller than the chunk size."
                />
              </FormItem>
            </SettingsSection>
          )}

          {isAnnotationTask && existingAnnotations.isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => existingAnnotations.refetch()}>
                  Retry
                </Button>
              }
            >
              Could not check for existing assistant annotations.
            </Alert>
          )}

          {hasExistingAnnotations && (
            <SettingsSection title="Existing assistant annotations" error>
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
              <FormItem
                title="Deletion strategy"
                subtitle="Choose whether existing assistant annotations should be replaced or preserved."
              >
                <TextField
                  select
                  fullWidth
                  variant="filled"
                  label="Existing annotations"
                  value={deletionStrategy}
                  onChange={handleChangeDeletionStrategy}
                >
                  <MenuItem value={DeletionStrategy.DELETE_EXISTING}>Delete and replace existing annotations</MenuItem>
                  <MenuItem value={DeletionStrategy.KEEP_EXISTING}>Keep existing annotations</MenuItem>
                </TextField>
              </FormItem>
            </SettingsSection>
          )}

          {createPromptTemplates.isError && <Alert severity="error">Could not create the prompt templates.</Alert>}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions>
        {annotationCheckPending && <CircularProgress size={24} aria-label="Checking existing annotations" />}
        <Box flexGrow={1} />
        <Button disabled={createPromptTemplates.isPending} onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          type="submit"
          startIcon={<PlayCircleIcon />}
          loading={createPromptTemplates.isPending}
          loadingPosition="start"
          disabled={nextDisabled}
        >
          Next
        </Button>
      </DialogActions>
    </form>
  );
});

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  error?: boolean;
}

function SettingsSection({ title, children, error = false }: SettingsSectionProps) {
  return (
    <Card variant="outlined" sx={{ borderColor: error ? "error.main" : undefined }}>
      <CardHeader
        title={title}
        slotProps={{ title: { variant: "h6", color: error ? "error.main" : undefined } }}
        sx={{ py: 1 }}
      />
      <Divider sx={{ borderColor: error ? "error.main" : undefined }} />
      <CardContent>
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

interface FormItemProps {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}

function FormItem({ title, subtitle, children }: FormItemProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, px: 1 }}>
      <Box width="50%">
        <Typography variant="subtitle1" fontWeight={500}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {subtitle}
        </Typography>
      </Box>
      <Box width="50%" flexShrink={0}>
        {children}
      </Box>
    </Box>
  );
}
