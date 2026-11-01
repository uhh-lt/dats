import { generalQueries } from "@api/general/generalQueries";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormMenu, FormText } from "@components/form-inputs";
import { PromptHooks } from "@core/prompt";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ExperimentRead } from "@models/ExperimentRead";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Alert, Button, Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDateTime } from "@utils/DateUtils";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback, useEffect, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { ExperimentHooks } from "../../../api/experimentHooks";
import { eligibleVersions } from "../_utils/runUtils";

type RunStartValues = {
  name: string;
  promptVersionId: number | "";
  model: string;
};

interface RunStartDialogProps {
  projectId: number;
  experiment: ExperimentRead;
  onRunStarted: (runId: number) => void;
}

/** Starts a run: a name, a prompt version that fits the experiment and a model (the first one by default). */
export function RunStartDialog({ projectId, experiment, onRunStarted }: RunStartDialogProps) {
  // dialog state
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();

  // queries for selections: the eligible prompt versions and the models
  const prompts = PromptHooks.useGetAllPrompts({ projectId, taskType: experiment.task_type });
  const versions = useMemo(() => eligibleVersions(experiment, prompts.data ?? []), [experiment, prompts.data]);
  const models = useQuery(generalQueries.availableModels());
  const defaultModel = models.data?.[0] ?? "";
  const takenNames = useMemo(() => new Set(experiment.runs.map((run) => run.name)), [experiment.runs]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form + reset form when dialog opens
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<RunStartValues>();
  useEffect(() => {
    if (isOpen) reset({ name: "", promptVersionId: "", model: defaultModel });
  }, [isOpen, defaultModel, reset]);

  // form actions
  const { mutate: createRunMutation, isPending } = ExperimentHooks.useCreateRun();
  const handleRunCreation = useCallback<SubmitHandler<RunStartValues>>(
    (data) => {
      const runName = data.name.trim();
      if (data.promptVersionId === "") return;
      createRunMutation(
        {
          requestBody: {
            experiment_id: experiment.id,
            name: runName,
            prompt_version_id: data.promptVersionId,
            model: data.model,
          },
        },
        {
          onSuccess: (updated) => {
            handleClose();
            const run = updated.runs.find((candidate) => candidate.name === runName);
            if (run) onRunStarted(run.id);
          },
        },
      );
    },
    [createRunMutation, experiment.id, handleClose, onRunStarted],
  );
  const handleError: SubmitErrorHandler<RunStartValues> = (data) => console.error(data);

  return (
    <>
      <Button startIcon={<PlayArrowIcon />} onClick={handleOpen} sx={{ flexShrink: 0 }}>
        Start new run
      </Button>
      <Dialog
        open={isOpen}
        onClose={closeOnEscape(handleClose)}
        maxWidth="md"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handleRunCreation, handleError)}
      >
        <DATSDialogHeader
          title={`Start a run of ${experiment.name}`}
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={3}>
            <Alert severity="info">
              Everything that is experimented with lives in the prompt version: text, codes, examples and settings. The
              run writes into the new virtual user {experiment.name}-&lt;run name&gt;.
            </Alert>
            {prompts.isSuccess && versions.length === 0 && (
              <Alert severity="warning">
                No prompt version fits this experiment. A version must be a prompt of the experiment's task that selects
                exactly the experiment's codes, and its prompt must not be archived.{" "}
                <Link to="/project/$projectId/prompts" params={{ projectId }}>
                  Open the prompts
                </Link>
              </Alert>
            )}
            <FormText
              name="name"
              control={control}
              rules={{
                required: "Run name is required",
                validate: (name) =>
                  !takenNames.has(String(name).trim()) || "The experiment already has a run with this name",
              }}
              textFieldProps={{
                label: "Run name",
                placeholder: "e.g. Zero-shot",
                autoFocus: true,
                error: Boolean(errors.name),
                helperText: <ErrorMessage errors={errors} name="name" />,
              }}
            />
            <FormMenu
              name="promptVersionId"
              control={control}
              rules={{ required: "Prompt version is required" }}
              textFieldProps={{
                label: "Prompt version",
                disabled: !prompts.isSuccess || versions.length === 0,
                error: Boolean(errors.promptVersionId),
                helperText: <ErrorMessage errors={errors} name="promptVersionId" />,
              }}
            >
              {versions.map(({ prompt, version }) => (
                <MenuItem key={version.id} value={version.id}>
                  {prompt.name} · version {version.version} ({formatDateTime(version.created)})
                </MenuItem>
              ))}
            </FormMenu>
            <FormMenu
              name="model"
              control={control}
              rules={{ required: "Model is required" }}
              textFieldProps={{
                label: "Model",
                disabled: !models.isSuccess,
                error: Boolean(errors.model) || models.isError,
                helperText: models.isError ? (
                  "Could not load the models"
                ) : (
                  <ErrorMessage errors={errors} name="model" />
                ),
              }}
            >
              {models.data?.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </FormMenu>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayArrowIcon />}
            fullWidth
            type="submit"
            disabled={versions.length === 0}
            loading={isPending}
            loadingPosition="start"
          >
            Start run
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
