import { ErrorMessage } from "@hookform/error-message";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton, TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Stack, Tab, Typography } from "@mui/material";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import LLMHooks from "../../../api/LLMHooks.ts";
import { LLMJobType } from "../../../api/openapi/models/LLMJobType.ts";
import { LLMPromptTemplates } from "../../../api/openapi/models/LLMPromptTemplates.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import FormTextMultiline from "../../FormInputs/FormTextMultiline.tsx";
import LLMUtterance from "./LLMUtterance.tsx";

type PromptEditorValues = {
  systemPrompt: string;
  userPrompt: string;
};

function PromptEditorStep({ projectId }: { projectId: number }) {
  // global state
  const tags = useAppSelector((state) => state.dialog.llmTags);
  const sdocIds = useAppSelector((state) => state.dialog.llmDocumentIds);
  const prompts = useAppSelector((state) => state.dialog.llmPrompts);
  const dispatch = useAppDispatch();

  // local state (to manage tabs)
  const [tab, setTab] = useState(prompts[0].language);
  const handleChangeTab = (_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  // react form handlers
  const handleSubmitPrompt = (language: string) => (formData: PromptEditorValues) => {
    dispatch(
      CRUDDialogActions.updateLLMPrompts({
        language: language,
        systemPrompt: formData.systemPrompt,
        userPrompt: formData.userPrompt,
      }),
    );
  };

  // start llm job
  const startLLMJobMutation = LLMHooks.useStartLLMJob();
  const handleStartLLMJob = () => {
    startLLMJobMutation.mutate(
      {
        requestBody: {
          project_id: projectId,
          prompts: prompts,
          llm_job_type: LLMJobType.DOCUMENT_TAGGING,
          specific_llm_job_parameters: {
            llm_job_type: LLMJobType.DOCUMENT_TAGGING,
            tag_ids: tags.map((tag) => tag.id),
            sdoc_ids: sdocIds,
          },
        },
      },
      {
        onSuccess: (data) => {
          dispatch(
            CRUDDialogActions.llmDialogGoToWaiting({
              jobId: data.id,
            }),
          );
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            These are my generated commands. Now is your last chance to edit them, before I get to work.
          </Typography>
        </LLMUtterance>
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList onChange={handleChangeTab}>
              {prompts.map((prompt) => (
                <Tab key={prompt.language} label={prompt.language} value={prompt.language} />
              ))}
            </TabList>
          </Box>
          {prompts.map((prompt) => (
            <TabPanel key={prompt.language} value={prompt.language} sx={{ px: 0 }}>
              <PromptEditorStepForm prompt={prompt} handleSavePrompt={handleSubmitPrompt(prompt.language)} />
            </TabPanel>
          ))}
        </TabContext>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => dispatch(CRUDDialogActions.previousLLMDialogStep())}>Back</Button>
        <LoadingButton
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={startLLMJobMutation.isPending}
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
