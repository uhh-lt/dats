import { ErrorMessage } from "@hookform/error-message";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Button, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { TrainingParameters } from "../../../../api/openapi/models/TrainingParameters.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import FormNumber from "../../../FormInputs/FormNumber.tsx";
import LLMUtterance from "../LLMUtterance.tsx";

function TrainingParameterEditorStep() {
  // global state
  const projectId = useAppSelector((state) => state.dialog.llmProjectId);
  const method = useAppSelector((state) => state.dialog.llmMethod);
  const approach = useAppSelector((state) => state.dialog.llmApproach);
  const tags = useAppSelector((state) => state.dialog.llmTags);
  const metadata = useAppSelector((state) => state.dialog.llmMetadata);
  const codes = useAppSelector((state) => state.dialog.llmCodes);
  const sdocIds = useAppSelector((state) => state.dialog.llmDocumentIds);
  const recommendedParameters = useAppSelector((state) => state.dialog.llmParameters);
  const deleteExistingAnnotations = useAppSelector((state) => state.dialog.llmDeleteExistingAnnotations);
  const dispatch = useAppDispatch();

  // local state
  const [trainingParameters, setTrainingParameters] = useState<TrainingParameters>(recommendedParameters);

  // handlers
  const handleChangeTrainingParameters = useCallback((formData: TrainingParameters) => {
    setTrainingParameters(formData);
  }, []);

  const handleBack = useCallback(() => {
    dispatch(CRUDDialogActions.previousLLMDialogStep());
  }, [dispatch]);

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
            training_parameters: trainingParameters,
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
              jobId: data.job_id,
              trainingParameters: trainingParameters,
            }),
          );
        },
      },
    );
  }, [
    method,
    projectId,
    approach,
    trainingParameters,
    sdocIds,
    tags,
    metadata,
    codes,
    deleteExistingAnnotations,
    startLLMJobMutation,
    dispatch,
  ]);

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            These are the recommended parameters. Feel free to edit them, before we start training a model.
          </Typography>
        </LLMUtterance>
        <TrainingParameterEditorStepForm
          trainingParameters={trainingParameters}
          handleSaveParams={handleChangeTrainingParameters}
        />
      </DialogContent>
      <DialogActions>
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

function TrainingParameterEditorStepForm({
  trainingParameters,
  handleSaveParams,
}: {
  trainingParameters: TrainingParameters;
  handleSaveParams: SubmitHandler<TrainingParameters>;
}) {
  // react form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<TrainingParameters>({
    defaultValues: {
      batch_size: trainingParameters.batch_size,
      learning_rate: trainingParameters.learning_rate,
      max_epochs: trainingParameters.max_epochs,
    },
  });

  // react form handlers
  const handleError: SubmitErrorHandler<TrainingParameters> = (data) => console.error(data);

  return (
    <Stack spacing={3} mt={2}>
      <FormNumber
        name="batch_size"
        control={control}
        rules={{ required: "Batch Size is required" }}
        textFieldProps={{
          label: "Batch Size",
          error: Boolean(errors.batch_size),
          helperText: <ErrorMessage errors={errors} name="batch_size" />,
          variant: "outlined",
          onBlur: () => handleSubmit(handleSaveParams, handleError)(),
          disabled: true,
        }}
      />
      <FormNumber
        name="learning_rate"
        control={control}
        rules={{ required: "Learning Rate is required" }}
        textFieldProps={{
          label: "Learning Rate",
          error: Boolean(errors.learning_rate),
          helperText: <ErrorMessage errors={errors} name="learning_rate" />,
          variant: "outlined",
          onBlur: () => handleSubmit(handleSaveParams, handleError)(),
          disabled: true,
        }}
      />
      <FormNumber
        name="max_epochs"
        control={control}
        rules={{ required: "Max Epochs is required" }}
        textFieldProps={{
          label: "Max Epochs",
          error: Boolean(errors.max_epochs),
          helperText: <ErrorMessage errors={errors} name="max_epochs" />,
          variant: "outlined",
          onBlur: () => handleSubmit(handleSaveParams, handleError)(),
          disabled: true,
        }}
      />
    </Stack>
  );
}

export default TrainingParameterEditorStep;
