import { ErrorMessage } from "@hookform/error-message";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton, TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Stack, Tab, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { ApproachType } from "../../../../api/openapi/models/ApproachType.ts";
import { LLMPromptTemplates } from "../../../../api/openapi/models/LLMPromptTemplates.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import FormTextMultiline from "../../../FormInputs/FormTextMultiline.tsx";
import SelectSentenceAnnotationsDialog from "../../../SentenceAnnotation/SelectSentenceAnnotationsDialog.tsx";
import LLMUtterance from "../LLMUtterance.tsx";

type PromptEditorValues = {
  systemPrompt: string;
  userPrompt: string;
};

function PromptEditorStep() {
  // global state
  const projectId = useAppSelector((state) => state.dialog.llmProjectId);
  const method = useAppSelector((state) => state.dialog.llmMethod);
  const approach = useAppSelector((state) => state.dialog.llmApproach);
  const tags = useAppSelector((state) => state.dialog.llmTags);
  const metadata = useAppSelector((state) => state.dialog.llmMetadata);
  const codes = useAppSelector((state) => state.dialog.llmCodes);
  const sdocIds = useAppSelector((state) => state.dialog.llmDocumentIds);
  const recommendedPrompts = useAppSelector((state) => state.dialog.llmPrompts);
  const deleteExistingAnnotations = useAppSelector((state) => state.dialog.llmDeleteExistingAnnotations);
  const dispatch = useAppDispatch();

  // local state (to manage tabs)
  const [tab, setTab] = useState(recommendedPrompts[0].language);
  const [prompts, setPrompts] = useState<LLMPromptTemplates[]>(recommendedPrompts);

  const handleChangeTab = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  }, []);

  // example selection (for few-shot learning)
  const { mutate: createPromptTemplatesMutation } = LLMHooks.useCreatePromptTemplates();
  const handleSelectExamples = useCallback(
    (annotationIds: number[]) => {
      if (!method) return;

      createPromptTemplatesMutation(
        {
          approachType: approach,
          requestBody: {
            llm_job_params: {
              llm_job_type: method,
              project_id: projectId,
              specific_task_parameters: {
                llm_job_type: method,
                tag_ids: tags.map((tag) => tag.id),
                project_metadata_ids: metadata.map((m) => m.id),
                code_ids: codes.map((code) => code.id),
                sdoc_ids: sdocIds,
              },
            },
            example_ids: annotationIds,
          },
        },
        {
          onSuccess(data) {
            dispatch(CRUDDialogActions.llmDialogUpdatePromptEditor({ prompts: data }));
            setPrompts(data);
          },
        },
      );
    },
    [method, projectId, tags, metadata, codes, sdocIds, approach, createPromptTemplatesMutation, dispatch],
  );

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

  // start llm job
  const { mutate: startLLMJobMutation, isPending: isStartPending } = LLMHooks.useStartLLMJob();
  const handleStartLLMJob = useCallback(() => {
    if (method === undefined) return;

    startLLMJobMutation(
      {
        requestBody: {
          project_id: projectId,
          llm_job_type: method,
          llm_approach_type: approach,
          specific_approach_parameters: {
            llm_approach_type: approach,
            prompts: prompts,
          },
          specific_task_parameters: {
            llm_job_type: method,
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
            CRUDDialogActions.llmDialogGoToWaiting({
              jobId: data.id,
              prompts: prompts,
            }),
          );
        },
      },
    );
  }, [
    method,
    projectId,
    approach,
    prompts,
    sdocIds,
    tags,
    metadata,
    codes,
    deleteExistingAnnotations,
    startLLMJobMutation,
    dispatch,
  ]);

  const handleBack = useCallback(() => {
    dispatch(CRUDDialogActions.previousLLMDialogStep());
  }, [dispatch]);

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            These are my generated commands. Now is your last chance to edit them, before I get to work.
          </Typography>
        </LLMUtterance>
        <TabContext value={tab}>
          <Box sx={{ mt: 3, borderBottom: 1, borderColor: "divider" }}>
            <TabList onChange={handleChangeTab}>
              {prompts.map((prompt) => (
                <Tab key={prompt.language} label={prompt.language} value={prompt.language} />
              ))}
            </TabList>
          </Box>
          {prompts.map((prompt) => (
            <TabPanel key={prompt.system_prompt + prompt.user_prompt} value={prompt.language} sx={{ px: 0 }}>
              <PromptEditorStepForm prompt={prompt} handleSavePrompt={handleChangePrompt(prompt.language)} />
            </TabPanel>
          ))}
        </TabContext>
      </DialogContent>
      <DialogActions>
        {approach === ApproachType.LLM_FEW_SHOT && (
          <SelectSentenceAnnotationsDialog
            title="Select few-shot sentence annotation examples"
            projectId={projectId}
            onConfirmSelection={handleSelectExamples}
          />
        )}
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <LoadingButton
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={isStartPending}
          loadingPosition="start"
          onClick={handleStartLLMJob}
        >
          Start!
        </LoadingButton>
      </DialogActions>
    </>
  );
}

function PromptEditorStepForm({
  prompt,
  handleSavePrompt,
}: {
  prompt: LLMPromptTemplates;
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

export default PromptEditorStep;
