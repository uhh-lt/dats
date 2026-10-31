import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { getIconComponent, Icon } from "@components/icons";
import { FormMenu, FormText } from "@components/form-inputs";
import { DEFAULT_OUTPUT_FORMATS, LANGUAGE_LABELS, PromptHooks, promptQueries, TASK_TYPE_LABELS } from "@core/prompt";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { PromptLanguage } from "@models/PromptLanguage";
import { PromptRead } from "@models/PromptRead";
import { TaskType } from "@models/TaskType";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Button,
  Dialog,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm, useWatch } from "react-hook-form";

type PromptCreateValues = {
  name: string;
  taskType: TaskType;
  language: PromptLanguage;
};

// the tasks in the order the LLM Assistant offers them
const TASK_TYPES = [TaskType.ANNOTATION, TaskType.SENTENCE_ANNOTATION, TaskType.TAGGING, TaskType.METADATA_EXTRACTION];

interface PromptCreateDialogProps {
  projectId: number;
  onCreated: (prompt: PromptRead) => void;
}

/** Creates a prompt from the default prompt of a task and language; the output format can be changed in the editor. */
export function PromptCreateDialog({ projectId, onCreated }: PromptCreateDialogProps) {
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
  } = useForm<PromptCreateValues>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: "",
        taskType: TaskType.ANNOTATION,
        language: PromptLanguage.EN,
      });
    }
  }, [isOpen, reset]);

  // the default prompt a new prompt starts with
  const taskType = useWatch({ control, name: "taskType" });
  const language = useWatch({ control, name: "language" });
  const defaultPrompt = useQuery({
    ...promptQueries.defaultPrompt(DEFAULT_OUTPUT_FORMATS[taskType ?? TaskType.ANNOTATION], language),
    enabled: isOpen,
  });

  // form actions
  const { mutate: createPromptMutation, isPending } = PromptHooks.useCreatePrompt();
  const handlePromptCreation = useCallback<SubmitHandler<PromptCreateValues>>(
    (data) => {
      const content = defaultPrompt.data;
      if (!content) return;
      createPromptMutation(
        {
          requestBody: {
            project_id: projectId,
            name: data.name,
            task_type: data.taskType,
            language: data.language,
            ...content,
          },
        },
        {
          onSuccess: (prompt) => {
            onCreated(prompt);
            handleClose();
          },
        },
      );
    },
    [defaultPrompt.data, createPromptMutation, projectId, onCreated, handleClose],
  );
  const handleError: SubmitErrorHandler<PromptCreateValues> = (data) => console.error(data);

  return (
    <>
      <ListItemButton onClick={handleOpen} sx={{ flexGrow: 1 }}>
        <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
        <ListItemText primary="Create new prompt" />
      </ListItemButton>
      <Dialog
        open={isOpen}
        onClose={closeOnEscape(handleClose)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handlePromptCreation, handleError)}
      >
        <DATSDialogHeader
          title="Create a new prompt"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={3} pt={1}>
            <Typography variant="body2">
              The prompt starts with the default prompt of its task and language as version 1. Choose the output format
              and the codes, tags or metadata fields in the editor.
            </Typography>
            <FormText
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              textFieldProps={{
                label: "Name",
                variant: "outlined",
                fullWidth: true,
                autoFocus: true,
                error: Boolean(errors.name),
                helperText: <ErrorMessage errors={errors} name="name" />,
              }}
            />
            <FormMenu
              name="taskType"
              control={control}
              textFieldProps={{ label: "Task", variant: "outlined", fullWidth: true }}
            >
              {TASK_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {TASK_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </FormMenu>
            <FormMenu
              name="language"
              control={control}
              textFieldProps={{ label: "Language", variant: "outlined", fullWidth: true }}
            >
              {Object.values(PromptLanguage).map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </MenuItem>
              ))}
            </FormMenu>
            {defaultPrompt.isError && <Alert severity="error">Could not load the default prompt.</Alert>}
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
            disabled={!defaultPrompt.data}
          >
            Create Prompt
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
