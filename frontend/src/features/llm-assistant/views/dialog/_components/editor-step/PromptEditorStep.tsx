import { FormTextMultiline } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { ApproachType } from "@models/ApproachType";
import { LLMAssistantPromptTemplates } from "@models/LLMAssistantPromptTemplates";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, CircularProgress, DialogActions, DialogContent, Stack, Tab, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { LlmAssistantHooks } from "../../../../api/llmAssistantHooks";
import { LLMAssistantActions } from "../../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "../LLMAssistantUtterance";
import { ExampleSelection } from "./ExampleSelection";

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
  const tags = useAppSelector((state) => state.llmAssistant.tags);
  const metadata = useAppSelector((state) => state.llmAssistant.metadata);
  const codes = useAppSelector((state) => state.llmAssistant.codes);
  const sdocIds = useAppSelector((state) => state.llmAssistant.documentIds);
  const recommendedPrompts = useAppSelector((state) => state.llmAssistant.prompts);
  const deleteExistingAnnotations = useAppSelector((state) => state.llmAssistant.deleteExistingAnnotations);
  const strategy = useAppSelector((state) => state.llmAssistant.strategy);
  const strategyParams = useAppSelector((state) => state.llmAssistant.strategyParams);
  const dispatch = useAppDispatch();

  // local state (to manage tabs)
  const [tab, setTab] = useState(recommendedPrompts[0].language);
  const [prompts, setPrompts] = useState<LLMAssistantPromptTemplates[]>(recommendedPrompts);

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
                tag_ids: tags.map((tag) => tag.id),
                project_metadata_ids: metadata.map((m) => m.id),
                code_ids: codes.map((code) => code.id),
                sdoc_ids: sdocIds,
              },
            },
            example_ids: selectedFlattened,
          },
        },
        {
          onSuccess(data) {
            // dispatch(LLMAssistantActions.updatePromptEditor({ prompts: data }));
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
      tags,
      metadata,
      codes,
      sdocIds,
    ],
  );
  const handleResetExamples = useCallback(() => {
    setSelectedAnnotationIds({});
    setPrompts(recommendedPrompts);
    // dispatch(LLMAssistantActions.updatePromptEditor({ prompts: recommendedPrompts }));
  }, [recommendedPrompts]);

  // react form handlers
  const handleChangePrompt = useCallback(
    (language: string) => (formData: PromptEditorValues) => {
      setPrompts((prevPrompts) => {
        return prevPrompts.map((prompt) => {
          if (prompt.language === language) {
            return {
              ...prompt,
              system_prompt: formData.systemPrompt,
              user_prompt: formData.userPrompt,
            };
          }
          return prompt;
        });
      });
    },
    [],
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
          specific_approach_parameters: {
            model: model,
            approach_type: approach,
            prompts: prompts,
          },
          specific_task_parameters: {
            task_type: method,
            sdoc_ids: sdocIds,
            tag_ids: tags.map((tag) => tag.id),
            project_metadata_ids: metadata.map((m) => m.id),
            code_ids: codes.map((code) => code.id),
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
    sdocIds,
    tags,
    metadata,
    codes,
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
            These are my generated commands. Now is your last chance to edit them, before I get to work.
          </Typography>
        </LLMAssistantUtterance>
        <TabContext value={tab}>
          <Box sx={{ mt: 3, borderBottom: 1, borderColor: "divider" }}>
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
      </DialogContent>
      <DialogActions>
        {approach === ApproachType.LLM_FEW_SHOT && method && (
          <>
            <ExampleSelection
              projectId={projectId}
              codes={codes}
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
