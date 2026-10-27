import { FormTextMultiline } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { ApproachType } from "@models/ApproachType";
import { LLMAssistantPromptTemplates } from "@models/LLMAssistantPromptTemplates";
import { PromptTemplateRead } from "@models/PromptTemplateRead";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import SaveIcon from "@mui/icons-material/Save";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  DialogActions,
  DialogContent,
  Divider,
  Grid2 as Grid,
  MenuItem,
  Stack,
  Tab,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { formatDateTime } from "@utils/DateUtils";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { LlmAssistantHooks } from "../../../../api/llmAssistantHooks";
import { PromptTemplateHooks } from "../../../../api/promptTemplateHooks";
import { LLMAssistantActions } from "../../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "../LLMAssistantUtterance";
import { ExampleSelection } from "./ExampleSelection";
import { PromptPreview } from "./PromptPreview";
import { PromptTemplateSaveDialog } from "./PromptTemplateSaveDialog";

// value of the template select for the generated (not stored) prompts
const GENERATED = "generated";

/** The stored template version the editor shows, and whether the prompts were edited since. */
interface PromptSource {
  templateId: number | undefined;
  versionId: number | undefined;
  isEdited: boolean;
}

const generatedSource: PromptSource = { templateId: undefined, versionId: undefined, isEdited: false };

function arePromptsEqual(a: LLMAssistantPromptTemplates[], b: LLMAssistantPromptTemplates[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type PromptEditorValues = {
  systemPrompt: string;
  userPrompt: string;
};

export function PromptEditorStep() {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const model = useAppSelector((state) => state.llmAssistant.modelId);
  const method = useAppSelector((state) => state.llmAssistant.method);
  const approach = useAppSelector((state) => state.llmAssistant.approach);
  const tagIds = useAppSelector((state) => state.llmAssistant.tagIds);
  const projectMetadataIds = useAppSelector((state) => state.llmAssistant.projectMetadataIds);
  const codeIds = useAppSelector((state) => state.llmAssistant.codeIds);
  const sdocIds = useAppSelector((state) => state.llmAssistant.documentIds);
  const recommendedPrompts = useAppSelector((state) => state.llmAssistant.prompts);
  const deleteExistingAnnotations = useAppSelector((state) => state.llmAssistant.deleteExistingAnnotations);
  const strategy = useAppSelector((state) => state.llmAssistant.strategy);
  const strategyParams = useAppSelector((state) => state.llmAssistant.strategyParams);
  const dispatch = useAppDispatch();

  // local state (to manage tabs)
  const [tab, setTab] = useState(recommendedPrompts[0].language);
  const [prompts, setPrompts] = useState<LLMAssistantPromptTemplates[]>(recommendedPrompts);

  // stored prompt templates of this task and strategy
  const [source, setSource] = useState<PromptSource>(generatedSource);
  const templates = PromptTemplateHooks.useGetPromptTemplates({ projectId, taskType: method, strategyType: strategy });
  const selectedTemplate = useMemo(
    () => templates.data?.find((template) => template.id === source.templateId),
    [templates.data, source.templateId],
  );
  const selectedVersion = useMemo(
    () => selectedTemplate?.versions.find((version) => version.id === source.versionId),
    [selectedTemplate, source.versionId],
  );

  const handleChangeTemplate = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const template = templates.data?.find((candidate) => candidate.id === Number(event.target.value));
      // the generated prompts, or the latest version of a stored template
      const latestVersion = template?.versions[template.versions.length - 1];
      if (!template || !latestVersion) {
        setSource(generatedSource);
        setPrompts(recommendedPrompts);
        return;
      }
      setSource({ templateId: template.id, versionId: latestVersion.id, isEdited: false });
      setPrompts(latestVersion.prompts);
    },
    [templates.data, recommendedPrompts],
  );
  const handleChangeVersion = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const version = selectedTemplate?.versions.find((candidate) => candidate.id === Number(event.target.value));
      if (!selectedTemplate || !version) return;
      setSource({ templateId: selectedTemplate.id, versionId: version.id, isEdited: false });
      setPrompts(version.prompts);
    },
    [selectedTemplate],
  );

  // save the prompts as the next version of the selected template, or as a new template
  const { mutate: createPromptTemplateVersionMutation, isPending: isSaveVersionPending } =
    PromptTemplateHooks.useCreatePromptTemplateVersion();
  const handleShowSavedTemplate = useCallback((template: PromptTemplateRead) => {
    const latestVersion = template.versions[template.versions.length - 1];
    setSource({ templateId: template.id, versionId: latestVersion.id, isEdited: false });
  }, []);
  const handleSaveVersion = useCallback(() => {
    if (!selectedTemplate) return;
    createPromptTemplateVersionMutation(
      { promptTemplateId: selectedTemplate.id, requestBody: { prompts } },
      { onSuccess: handleShowSavedTemplate },
    );
  }, [selectedTemplate, prompts, createPromptTemplateVersionMutation, handleShowSavedTemplate]);

  const handleChangeTab = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  }, []);

  // example selection (for few-shot learning)
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<Record<number, number[]>>({});
  const { mutate: createPromptTemplatesMutation, isPending } = LlmAssistantHooks.useCreatePromptTemplates();
  const handleSelectExamples = useCallback(
    (codeId: number, annotationIds: number[]) => {
      if (!method) return;
      if (!strategy) return;
      setSelectedAnnotationIds((prev) => {
        const newSelected = { ...prev };
        newSelected[codeId] = annotationIds;
        return newSelected;
      });

      const newSelected = { ...selectedAnnotationIds };
      newSelected[codeId] = annotationIds;
      const selectedFlattened = Object.values(newSelected).flat();

      createPromptTemplatesMutation(
        {
          approachType: approach,
          strategyType: strategy,
          requestBody: {
            job_params: {
              task_type: method,
              project_id: projectId,
              specific_task_parameters: {
                task_type: method,
                tag_ids: tagIds,
                project_metadata_ids: projectMetadataIds,
                code_ids: codeIds,
                sdoc_ids: sdocIds,
              },
            },
            example_ids: selectedFlattened,
          },
        },
        {
          onSuccess(data) {
            setSource(generatedSource);
            setPrompts(data);
          },
        },
      );
    },
    [
      method,
      strategy,
      selectedAnnotationIds,
      createPromptTemplatesMutation,
      approach,
      projectId,
      tagIds,
      projectMetadataIds,
      codeIds,
      sdocIds,
    ],
  );
  const handleResetExamples = useCallback(() => {
    setSelectedAnnotationIds({});
    setSource(generatedSource);
    setPrompts(recommendedPrompts);
  }, [recommendedPrompts]);

  // react form handlers
  const handleChangePrompt = useCallback(
    (language: string) => (formData: PromptEditorValues) => {
      const newPrompts = prompts.map((prompt) => {
        if (prompt.language === language) {
          return {
            ...prompt,
            system_prompt: formData.systemPrompt,
            user_prompt: formData.userPrompt,
          };
        }
        return prompt;
      });
      if (arePromptsEqual(newPrompts, prompts)) return;
      setPrompts(newPrompts);
      setSource((prevSource) => ({ ...prevSource, isEdited: true }));
    },
    [prompts],
  );

  // start LLM Assistant job
  const { mutate: startLLMAssistantJobMutation, isPending: isStartPending } =
    LlmAssistantHooks.useStartLLMAssistantJob();
  const handleStartLLMAssistantJob = useCallback(() => {
    if (model === undefined) return;
    if (method === undefined) return;
    if (strategy === undefined) return;
    if (strategyParams === undefined) return;

    startLLMAssistantJobMutation(
      {
        requestBody: {
          project_id: projectId,
          task_type: method,
          approach_type: approach,
          strategy_type: strategy,
          specific_strategy_parameters: strategyParams,
          // run with the stored version if its prompts were not edited, otherwise with the edited prompts
          specific_approach_parameters:
            selectedVersion && !source.isEdited
              ? { model: model, approach_type: approach, prompt_template_version_id: selectedVersion.id }
              : { model: model, approach_type: approach, prompts: prompts },
          specific_task_parameters: {
            task_type: method,
            sdoc_ids: sdocIds,
            tag_ids: tagIds,
            project_metadata_ids: projectMetadataIds,
            code_ids: codeIds,
            delete_existing_annotations: deleteExistingAnnotations,
          },
        },
      },
      {
        onSuccess: (data) => {
          dispatch(
            LLMAssistantActions.goToWaiting({
              jobId: data.job_id,
              prompts: prompts,
            }),
          );
        },
      },
    );
  }, [
    model,
    method,
    strategy,
    strategyParams,
    projectId,
    approach,
    prompts,
    selectedVersion,
    source.isEdited,
    sdocIds,
    tagIds,
    projectMetadataIds,
    codeIds,
    deleteExistingAnnotations,
    startLLMAssistantJobMutation,
    dispatch,
  ]);

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  return (
    <>
      <DialogContent>
        <LLMAssistantUtterance>
          <Typography>
            These are my commands. Use a stored prompt template or edit the prompts and save them as a new version. The
            placeholder {"<codes>"} is replaced with the definitions of the selected codes. The preview shows exactly
            what I will receive.
          </Typography>
        </LLMAssistantUtterance>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                size="small"
                label="Prompt template"
                value={source.templateId ?? GENERATED}
                onChange={handleChangeTemplate}
                sx={{ flexGrow: 1 }}
                disabled={templates.isLoading}
              >
                <MenuItem value={GENERATED}>Generated prompts (not saved)</MenuItem>
                {templates.data?.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </TextField>
              {selectedTemplate && (
                <TextField
                  select
                  size="small"
                  label="Version"
                  value={source.versionId ?? ""}
                  onChange={handleChangeVersion}
                  sx={{ minWidth: 200 }}
                >
                  {selectedTemplate.versions.map((version) => (
                    <MenuItem key={version.id} value={version.id}>
                      v{version.version} ({formatDateTime(version.created)})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                {selectedVersion
                  ? `${selectedTemplate?.name} v${selectedVersion.version}${source.isEdited ? " (edited, not saved)" : ""}`
                  : "Generated prompts, not saved"}
              </Typography>
              {selectedTemplate && (
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleSaveVersion}
                  disabled={!source.isEdited}
                  loading={isSaveVersionPending}
                  loadingPosition="start"
                >
                  Save as new version
                </Button>
              )}
              {method && strategy && (
                <PromptTemplateSaveDialog
                  projectId={projectId}
                  taskType={method}
                  strategyType={strategy}
                  prompts={prompts}
                  onSaved={handleShowSavedTemplate}
                />
              )}
            </Stack>
            <TabContext value={tab}>
              <Box sx={{ mt: 1, borderBottom: 1, borderColor: "divider" }}>
                <TabList onChange={handleChangeTab}>
                  {prompts.map((prompt) => (
                    <Tab key={prompt.language} label={prompt.language} value={prompt.language} />
                  ))}
                </TabList>
              </Box>
              {prompts.map((prompt) => (
                <TabPanel
                  key={prompt.system_prompt + prompt.user_prompt}
                  value={prompt.language}
                  sx={{ px: 0, position: "relative" }}
                >
                  {isPending && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CircularProgress size={64} />
                    </Box>
                  )}
                  <PromptEditorStepForm prompt={prompt} handleSavePrompt={handleChangePrompt(prompt.language)} />
                </TabPanel>
              ))}
            </TabContext>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardHeader title="Preview" slotProps={{ title: { variant: "h6" } }} sx={{ py: 1 }} />
              <Divider />
              <CardContent>
                <PromptPreview prompts={prompts} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {approach === ApproachType.LLM_FEW_SHOT && method && (
          <>
            <ExampleSelection
              projectId={projectId}
              codeIds={codeIds}
              onConfirmSelection={handleSelectExamples}
              method={method}
            />
            <Button onClick={handleResetExamples}>Reset examples</Button>
          </>
        )}
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={isStartPending}
          loadingPosition="start"
          onClick={handleStartLLMAssistantJob}
        >
          Start!
        </Button>
      </DialogActions>
    </>
  );
}

function PromptEditorStepForm({
  prompt,
  handleSavePrompt,
}: {
  prompt: LLMAssistantPromptTemplates;
  handleSavePrompt: SubmitHandler<PromptEditorValues>;
}) {
  // react form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<PromptEditorValues>({
    defaultValues: {
      systemPrompt: prompt.system_prompt,
      userPrompt: prompt.user_prompt,
    },
  });

  // react form handlers
  const handleError: SubmitErrorHandler<PromptEditorValues> = (data) => console.error(data);

  return (
    <Stack spacing={3}>
      <FormTextMultiline
        name="systemPrompt"
        control={control}
        rules={{ required: "System Prompt is required" }}
        textFieldProps={{
          label: "System Prompt",
          error: Boolean(errors.systemPrompt),
          helperText: <ErrorMessage errors={errors} name="systemPrompt" />,
          variant: "outlined",
          minRows: 2,
          onBlur: () => handleSubmit(handleSavePrompt, handleError)(),
        }}
      />
      <FormTextMultiline
        name="userPrompt"
        control={control}
        rules={{ required: "User Prompt is required" }}
        textFieldProps={{
          label: "User Prompt",
          error: Boolean(errors.userPrompt),
          helperText: <ErrorMessage errors={errors} name="userPrompt" />,
          variant: "outlined",
          onBlur: () => handleSubmit(handleSavePrompt, handleError)(),
        }}
      />
    </Stack>
  );
}
