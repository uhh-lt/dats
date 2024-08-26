import { ErrorMessage } from "@hookform/error-message";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Button, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import LLMHooks from "../../../api/LLMHooks.ts";
import { DocumentTaggingLLMJobParams } from "../../../api/openapi/models/DocumentTaggingLLMJobParams.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { LLMJobType } from "../../../api/openapi/models/LLMJobType.ts";
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
  const dispatch = useAppDispatch();

  const buildUserPrompt = (tags: DocumentTagRead[]) => {
    let result = "I need help with something.\nI am interested in the following topics:";
    for (const tag of tags) {
      result += "\n" + tag.name + " - " + tag.description;
    }
    result += "\n\nPlease help me with this.";
    return result;
  };

  // react form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<PromptEditorValues>({
    defaultValues: {
      systemPrompt: "You are a helpful assistant!",
      userPrompt: buildUserPrompt(tags),
    },
  });

  const startLLMJobMutation = LLMHooks.useStartLLMJob();

  // react form handlers
  const handleSubmitPrompt: SubmitHandler<PromptEditorValues> = (formData) => {
    startLLMJobMutation.mutate(
      {
        requestBody: {
          project_id: projectId,
          system_prompt: "string",
          user_prompt: "string",
          llm_job_type: LLMJobType.DOCUMENT_TAGGING,
          specific_llm_job_parameters: {
            llm_job_type: LLMJobType.DOCUMENT_TAGGING,
            tag_ids: tags.map((tag) => tag.id),
            sdoc_ids: sdocIds,
          } as DocumentTaggingLLMJobParams,
        },
      },
      {
        onSuccess: (data) => {
          dispatch(
            CRUDDialogActions.llmDialogSetPrompts({
              jobId: data.id,
              systemPrompt: formData.systemPrompt,
              userPrompt: formData.userPrompt,
            }),
          );
        },
      },
    );
  };

  const handleError: SubmitErrorHandler<PromptEditorValues> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(handleSubmitPrompt, handleError)}>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            These are my generated commands. Now is your last chance to edit them, before I get to work.
          </Typography>
        </LLMUtterance>
        <Stack spacing={3} mt={3}>
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
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => dispatch(CRUDDialogActions.previousLLMDialogStep())}>Back</Button>
        <LoadingButton
          variant="contained"
          startIcon={<PlayCircleIcon />}
          type="submit"
          loading={startLLMJobMutation.isPending}
          loadingPosition="start"
        >
          Start!
        </LoadingButton>
      </DialogActions>
    </form>
  );
}

export default PromptEditorStep;
