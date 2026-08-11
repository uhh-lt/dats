import { FormMenu } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { ClassifierAveraging } from "@models/ClassifierAveraging";
import { ClassifierEvaluationParams } from "@models/ClassifierEvaluationParams";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  DialogActions,
  Divider,
  MenuItem,
  Stack,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { ClassifierHooks } from "../../../_api/classifierQueryOptions";
import { ClassifierActions } from "../../../store/classifierSlice";

type EvaluationSettings = {
  averaging: NonNullable<ClassifierEvaluationParams["averaging"]>;
};

const averagingOptions = [ClassifierAveraging.MICRO, ClassifierAveraging.MACRO];

export function EvalSettingsStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.classifierModel);
  const task = useAppSelector((state) => state.classifier.classifierTask);
  const classifierId = useAppSelector((state) => state.classifier.classifierId);
  const projectId = useAppSelector((state) => state.classifier.classifierProjectId);
  const userIds = useAppSelector((state) => state.classifier.classifierUserIds);
  const tagIds = useAppSelector((state) => state.classifier.classifierTagIds);
  const dispatch = useAppDispatch();

  // read the classifier to pre-fill the averaging strategy from its training settings
  const classifiers = ClassifierHooks.useGetAllClassifiers(projectId);
  const classifier = classifiers.data?.find((c) => c.id === classifierId);
  const storedAveraging =
    (classifier?.train_params["averaging"] as ClassifierAveraging | undefined) ?? ClassifierAveraging.MICRO;

  // form state
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EvaluationSettings>({
    defaultValues: {
      averaging: storedAveraging,
    },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(ClassifierActions.previousClassifierDialogStep());
  };
  const { mutate: startClassifierJobMutation, isPending } = ClassifierHooks.useStartClassifierJob();
  const onSubmit = (data: EvaluationSettings) => {
    if (model === undefined || task === undefined || classifierId === undefined) return;

    const evalParams: ClassifierEvaluationParams = {
      task_type: task,
      classifier_id: classifierId,
      tag_ids: tagIds,
      user_ids: userIds,
      averaging: data.averaging,
    };

    startClassifierJobMutation(
      {
        requestBody: {
          model_type: model,
          task_type: task,
          project_id: projectId,
          task_parameters: evalParams,
        },
      },
      {
        onSuccess: (jobData) => {
          dispatch(ClassifierActions.onClassifierDialogStartJob(jobData.job_id));
        },
      },
    );
  };
  const onError: SubmitErrorHandler<EvaluationSettings> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="myFlexContainer myFlexFillAllContainer">
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          Configure the evaluation settings. The averaging strategy is pre-filled with the value the classifier was
          trained with, but you can override it here.
        </Alert>
        <Card variant="outlined">
          <CardHeader
            title="Evaluation configuration"
            slotProps={{
              title: {
                variant: "h6",
              },
            }}
            sx={{ py: 1 }}
          />
          <Divider />
          <CardContent>
            <FormMenu
              name="averaging"
              control={control}
              textFieldProps={{
                label: "Averaging",
                error: Boolean(errors.averaging),
                helperText: <ErrorMessage errors={errors} name="averaging" />,
                variant: "filled",
                fullWidth: true,
              }}
            >
              {averagingOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </FormMenu>
          </CardContent>
        </Card>
      </Stack>
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handlePrev}>Back</Button>
        <Button type="submit" loading={isPending} loadingPosition="start">
          Next
        </Button>
      </DialogActions>
    </form>
  );
}
