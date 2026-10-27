import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormText } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { LLMAssistantPromptTemplates } from "@models/LLMAssistantPromptTemplates";
import { PromptTemplateRead } from "@models/PromptTemplateRead";
import { StrategyType } from "@models/StrategyType";
import { TaskType } from "@models/TaskType";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { PromptTemplateHooks } from "../../../../api/promptTemplateHooks";

type PromptTemplateSaveValues = {
  name: string;
};

interface PromptTemplateSaveDialogProps {
  projectId: number;
  taskType: TaskType;
  strategyType: StrategyType;
  prompts: LLMAssistantPromptTemplates[];
  onSaved: (template: PromptTemplateRead) => void;
}

/** Saves the current prompts as version 1 of a new, named prompt template of the project. */
export function PromptTemplateSaveDialog({
  projectId,
  taskType,
  strategyType,
  prompts,
  onSaved,
}: PromptTemplateSaveDialogProps) {
  // dialog state
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<PromptTemplateSaveValues>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({ name: "" });
    }
  }, [isOpen, reset]);

  // form actions
  const { mutate: createPromptTemplateMutation, isPending } = PromptTemplateHooks.useCreatePromptTemplate();
  const handlePromptTemplateCreation = useCallback<SubmitHandler<PromptTemplateSaveValues>>(
    (data) => {
      createPromptTemplateMutation(
        {
          requestBody: {
            project_id: projectId,
            name: data.name,
            task_type: taskType,
            strategy_type: strategyType,
            prompts,
          },
        },
        {
          onSuccess: (template) => {
            onSaved(template);
            handleClose();
          },
        },
      );
    },
    [createPromptTemplateMutation, projectId, taskType, strategyType, prompts, onSaved, handleClose],
  );
  const handleError: SubmitErrorHandler<PromptTemplateSaveValues> = (data) => console.error(data);

  return (
    <>
      <Button onClick={handleOpen}>Save as new template</Button>
      <Dialog
        open={isOpen}
        onClose={closeOnEscape(handleClose)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handlePromptTemplateCreation, handleError)}
      >
        <DATSDialogHeader
          title="Save as new prompt template"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Typography variant="body2">
              The prompts of all languages are saved as version 1 of a new template. Every later save creates a new
              version; older versions stay available.
            </Typography>
            <FormText
              name="name"
              control={control}
              rules={{ required: "Template name is required" }}
              textFieldProps={{
                label: "Template name",
                variant: "outlined",
                fullWidth: true,
                autoFocus: true,
                error: Boolean(errors.name),
                helperText: <ErrorMessage errors={errors} name="name" />,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            fullWidth
            type="submit"
            loading={isPending}
            loadingPosition="start"
          >
            Create Prompt Template
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
