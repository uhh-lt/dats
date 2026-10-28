import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { getIconComponent, Icon } from "@components/icons";
import { FormMenu, FormText } from "@components/form-inputs";
import {
  LANGUAGE_LABELS,
  OUTPUT_FORMAT_LABELS,
  PromptTemplateHooks,
  promptTemplateQueries,
  TASK_TYPE_LABELS,
} from "@core/prompt-template";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { OutputFormat } from "@models/OutputFormat";
import { PromptLanguage } from "@models/PromptLanguage";
import { PromptTemplateRead } from "@models/PromptTemplateRead";
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

type PromptTemplateCreateValues = {
  name: string;
  outputFormat: OutputFormat;
  language: PromptLanguage;
};

// the task of a new template follows from the output format of its default prompt
const OUTPUT_FORMAT_TASK_TYPES: Record<OutputFormat, TaskType> = {
  [OutputFormat.TAGS]: TaskType.TAGGING,
  [OutputFormat.METADATA]: TaskType.METADATA_EXTRACTION,
  [OutputFormat.INLINE]: TaskType.ANNOTATION,
  [OutputFormat.CONTEXT]: TaskType.ANNOTATION,
  [OutputFormat.SENTENCES]: TaskType.SENTENCE_ANNOTATION,
};

interface PromptTemplateCreateDialogProps {
  projectId: number;
  onCreated: (template: PromptTemplateRead) => void;
}

/** Creates a prompt template from the default prompt of an output format and language. */
export function PromptTemplateCreateDialog({ projectId, onCreated }: PromptTemplateCreateDialogProps) {
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
  } = useForm<PromptTemplateCreateValues>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: "",
        outputFormat: OutputFormat.SENTENCES,
        language: PromptLanguage.EN,
      });
    }
  }, [isOpen, reset]);

  // the default prompt a new template starts with
  const outputFormat = useWatch({ control, name: "outputFormat" });
  const language = useWatch({ control, name: "language" });
  const defaultPrompt = useQuery({
    ...promptTemplateQueries.defaultPrompt(outputFormat, language),
    enabled: isOpen,
  });

  // form actions
  const { mutate: createPromptTemplateMutation, isPending } = PromptTemplateHooks.useCreatePromptTemplate();
  const handlePromptTemplateCreation = useCallback<SubmitHandler<PromptTemplateCreateValues>>(
    (data) => {
      const content = defaultPrompt.data;
      if (!content) return;
      createPromptTemplateMutation(
        {
          requestBody: {
            project_id: projectId,
            name: data.name,
            task_type: OUTPUT_FORMAT_TASK_TYPES[data.outputFormat],
            language: data.language,
            ...content,
          },
        },
        {
          onSuccess: (template) => {
            onCreated(template);
            handleClose();
          },
        },
      );
    },
    [defaultPrompt.data, createPromptTemplateMutation, projectId, onCreated, handleClose],
  );
  const handleError: SubmitErrorHandler<PromptTemplateCreateValues> = (data) => console.error(data);

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
        onSubmit={handleSubmit(handlePromptTemplateCreation, handleError)}
      >
        <DATSDialogHeader
          title="Create a new prompt template"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={3} pt={1}>
            <Typography variant="body2">
              The template starts with the default prompt of its task, answer format and language, as version 1. It
              selects nothing yet: choose the codes, tags or metadata fields in the editor. The language decides the
              text of the answer instructions and examples.
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
            <FormMenu
              name="outputFormat"
              control={control}
              textFieldProps={{ label: "Task and answer format", variant: "outlined", fullWidth: true }}
            >
              {Object.values(OutputFormat).map((format) => (
                <MenuItem key={format} value={format}>
                  {TASK_TYPE_LABELS[OUTPUT_FORMAT_TASK_TYPES[format]]}: {OUTPUT_FORMAT_LABELS[format]}
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
            Create Prompt Template
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
