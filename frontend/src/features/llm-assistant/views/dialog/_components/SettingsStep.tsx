import { generalQueries } from "@api/general/generalQueries";
import {
  DEFAULT_OUTPUT_FORMATS,
  DOCUMENT_UNIT_LABELS,
  LANGUAGE_LABELS,
  OUTPUT_FORMAT_LABELS,
  OutputFormatAbout,
  promptQueries,
  withDefaultSettings,
} from "@core/prompt";
import { DocumentUnit } from "@models/DocumentUnit";
import { OutputFormat } from "@models/OutputFormat";
import { PromptLanguage } from "@models/PromptLanguage";
import { PromptSettings } from "@models/PromptSettings";
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
import { ChangeEvent, memo, ReactNode, useCallback, useState } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

const isValidSettings = (settings: Required<PromptSettings>) =>
  settings.fuzzy_threshold >= 0 &&
  settings.fuzzy_threshold <= 1 &&
  Number.isInteger(settings.context_before_chars) &&
  settings.context_before_chars >= 0 &&
  Number.isInteger(settings.context_after_chars) &&
  settings.context_after_chars >= 0 &&
  Number.isInteger(settings.chunk_size_tokens) &&
  settings.chunk_size_tokens > 0 &&
  Number.isInteger(settings.chunk_overlap_tokens) &&
  settings.chunk_overlap_tokens >= 0 &&
  settings.chunk_overlap_tokens < settings.chunk_size_tokens;

/** Configures the model and, in guided mode, the language, input and output format of the default prompt. */
export const SettingsStep = memo(() => {
  const availableLLMs = useQuery(generalQueries.availableModels());
  const mode = useAppSelector((state) => state.llmAssistant.mode);
  const method = useAppSelector((state) => state.llmAssistant.method);
  const savedModelId = useAppSelector((state) => state.llmAssistant.modelId);
  const savedLanguage = useAppSelector((state) => state.llmAssistant.language);
  const savedOutputFormat = useAppSelector((state) => state.llmAssistant.outputFormat);
  const savedDocumentUnit = useAppSelector((state) => state.llmAssistant.documentUnit);
  const savedSettings = useAppSelector((state) => state.llmAssistant.settings);
  const dispatch = useAppDispatch();
  const taskInfo = useQuery({ ...promptQueries.taskInfo(method), enabled: mode === "guided" });

  // local state
  const [modelId, setModelId] = useState(savedModelId);
  const [language, setLanguage] = useState(savedLanguage);
  const [outputFormat, setOutputFormat] = useState<OutputFormat | undefined>(
    savedOutputFormat ?? (method ? DEFAULT_OUTPUT_FORMATS[method] : undefined),
  );
  const [documentUnit, setDocumentUnit] = useState<DocumentUnit | undefined>(savedDocumentUnit);
  const [settings, setSettings] = useState(() => withDefaultSettings(savedSettings));
  const formatInfo = taskInfo.data?.output_formats.find((info) => info.output_format === outputFormat);
  // the document unit of the default prompt until the user chooses one
  const unit = documentUnit ?? formatInfo?.default_document_unit;

  const handleChangeModel = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setModelId(event.target.value);
  }, []);
  const handleChangeLanguage = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLanguage(event.target.value as PromptLanguage);
  }, []);
  const handleChangeOutputFormat = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // an input format the user chose stays; otherwise the default of the new output format applies
    setOutputFormat(event.target.value as OutputFormat);
  }, []);
  const handleChangeDocumentUnit = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDocumentUnit(event.target.value as DocumentUnit);
  }, []);
  const handleChangeSetting = useCallback(
    (field: keyof PromptSettings) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = Number(event.target.value);
      setSettings((current) => ({ ...current, [field]: Number.isNaN(value) ? current[field] : value }));
    },
    [],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);
  const handleSubmit = useCallback(() => {
    if (!modelId) return;
    if (mode === "prompt") {
      dispatch(LLMAssistantActions.goToReview({ modelId }));
      return;
    }
    dispatch(LLMAssistantActions.goToReview({ modelId, language, outputFormat, documentUnit: unit, settings }));
  }, [dispatch, mode, modelId, language, outputFormat, unit, settings]);

  const nextDisabled =
    !modelId ||
    availableLLMs.isError ||
    availableLLMs.data?.length === 0 ||
    (mode === "guided" && (!outputFormat || !unit || !isValidSettings(settings)));

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
          <LLMAssistantUtterance>
            <Typography>
              {mode === "prompt"
                ? "Choose the model that should run the prompt. Next, you see the prompt as I will receive it."
                : "Configure how I should process the selected documents. Next, you see the prompt as I will receive it."}
            </Typography>
          </LLMAssistantUtterance>
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
          <SettingsSection title="Model">
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
          </SettingsSection>
          {mode === "guided" && (
            <SettingsSection title="Prompt">
              {taskInfo.isError && <Alert severity="error">Could not load the formats of this task.</Alert>}
              <FormItem title="Language" subtitle="The language of the prompt; documents can be in any language.">
                <TextField
                  select
                  fullWidth
                  variant="filled"
                  label="Language"
                  value={language}
                  onChange={handleChangeLanguage}
                >
                  {Object.values(PromptLanguage).map((candidate) => (
                    <MenuItem key={candidate} value={candidate}>
                      {LANGUAGE_LABELS[candidate]}
                    </MenuItem>
                  ))}
                </TextField>
              </FormItem>
              <FormItem
                title="Input format"
                subtitle={
                  taskInfo.data?.document_units.find((info) => info.unit === unit)?.description ??
                  "How the documents are sent to the LLM."
                }
              >
                <TextField
                  select
                  fullWidth
                  variant="filled"
                  label="Input format"
                  value={unit ?? ""}
                  onChange={handleChangeDocumentUnit}
                  disabled={!taskInfo.data}
                >
                  {(taskInfo.data?.document_units ?? []).map((info) => (
                    <MenuItem key={info.unit} value={info.unit}>
                      {DOCUMENT_UNIT_LABELS[info.unit]}
                    </MenuItem>
                  ))}
                  {!taskInfo.data && unit && <MenuItem value={unit}>{DOCUMENT_UNIT_LABELS[unit]}</MenuItem>}
                </TextField>
              </FormItem>
              <FormItem title="Output format" subtitle={formatInfo?.description ?? "How the LLM answers."}>
                <TextField
                  select
                  fullWidth
                  variant="filled"
                  label="Output format"
                  value={outputFormat ?? ""}
                  onChange={handleChangeOutputFormat}
                  disabled={!taskInfo.data}
                >
                  {(taskInfo.data?.output_formats ?? []).map((info) => (
                    <MenuItem key={info.output_format} value={info.output_format}>
                      {OUTPUT_FORMAT_LABELS[info.output_format]}
                    </MenuItem>
                  ))}
                  {!taskInfo.data && outputFormat && (
                    <MenuItem value={outputFormat}>{OUTPUT_FORMAT_LABELS[outputFormat]}</MenuItem>
                  )}
                </TextField>
              </FormItem>
              {formatInfo && <OutputFormatAbout name={formatInfo.name} details={formatInfo.details} />}
            </SettingsSection>
          )}
          {mode === "guided" && unit === DocumentUnit.CHUNKS && (
            <SettingsSection title="Input parameters">
              <FormItem title="Chunk size" subtitle="Maximum number of tokens sent to the model in one chunk.">
                <NumberField
                  label="Tokens"
                  value={settings.chunk_size_tokens}
                  onChange={handleChangeSetting("chunk_size_tokens")}
                  error={!Number.isInteger(settings.chunk_size_tokens) || settings.chunk_size_tokens <= 0}
                  helperText="Enter a positive whole number."
                />
              </FormItem>
              <FormItem
                title="Chunk overlap"
                subtitle="Tokens repeated between adjacent chunks to preserve surrounding context."
              >
                <NumberField
                  label="Tokens"
                  step={10}
                  value={settings.chunk_overlap_tokens}
                  onChange={handleChangeSetting("chunk_overlap_tokens")}
                  error={
                    !Number.isInteger(settings.chunk_overlap_tokens) ||
                    settings.chunk_overlap_tokens < 0 ||
                    settings.chunk_overlap_tokens >= settings.chunk_size_tokens
                  }
                  helperText="Must be a whole number smaller than the chunk size."
                />
              </FormItem>
            </SettingsSection>
          )}
          {mode === "guided" && outputFormat === OutputFormat.CONTEXT && (
            <SettingsSection title="Output parameters">
              <FormItem title="Fuzzy threshold" subtitle="Minimum similarity required to locate an extracted quote.">
                <NumberField
                  label="Similarity"
                  step={0.05}
                  value={settings.fuzzy_threshold}
                  onChange={handleChangeSetting("fuzzy_threshold")}
                  error={settings.fuzzy_threshold < 0 || settings.fuzzy_threshold > 1}
                  helperText="Enter a value between 0 and 1."
                />
              </FormItem>
              <FormItem title="Context before" subtitle="Characters of context requested before each extracted quote.">
                <NumberField
                  label="Characters"
                  step={8}
                  value={settings.context_before_chars}
                  onChange={handleChangeSetting("context_before_chars")}
                  error={!Number.isInteger(settings.context_before_chars) || settings.context_before_chars < 0}
                  helperText="Enter a non-negative whole number."
                />
              </FormItem>
              <FormItem title="Context after" subtitle="Characters of context requested after each extracted quote.">
                <NumberField
                  label="Characters"
                  step={8}
                  value={settings.context_after_chars}
                  onChange={handleChangeSetting("context_after_chars")}
                  error={!Number.isInteger(settings.context_after_chars) || settings.context_after_chars < 0}
                  helperText="Enter a non-negative whole number."
                />
              </FormItem>
            </SettingsSection>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button variant="contained" type="submit" startIcon={<PlayCircleIcon />} disabled={nextDisabled}>
          Next
        </Button>
      </DialogActions>
    </form>
  );
});

interface NumberFieldProps {
  label: string;
  value: number;
  step?: number;
  error: boolean;
  helperText: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

function NumberField({ label, value, step = 1, error, helperText, onChange }: NumberFieldProps) {
  return (
    <TextField
      fullWidth
      variant="filled"
      type="number"
      label={label}
      value={value}
      onChange={onChange}
      slotProps={{ htmlInput: { step, min: 0 } }}
      error={error}
      helperText={helperText}
    />
  );
}

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <Card variant="outlined">
      <CardHeader title={title} slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
      <Divider />
      <CardContent>
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

interface FormItemProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
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
