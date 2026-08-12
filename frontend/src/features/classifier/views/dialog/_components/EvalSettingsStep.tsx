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
  CircularProgress,
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
  const model = useAppSelector((state) => state.classifier.context.model);
  const task = useAppSelector((state) => state.classifier.context.task);
  const classifierId = useAppSelector((state) => state.classifier.context.classifierId);
  const projectId = useAppSelector((state) => state.classifier.context.projectId);
  const userIds = useAppSelector((state) => state.classifier.dataset.userIds);
  const tagIds = useAppSelector((state) => state.classifier.dataset.tagIds);
  const mergeChildren = useAppSelector((state) => state.classifier.dataset.mergeChildren);
  const savedAveraging = useAppSelector((state) => state.classifier.drafts.evaluationAveraging);
  const dispatch = useAppDispatch();

  // read the classifier to pre-fill the averaging strategy from its training settings
  const classifiers = ClassifierHooks.useGetAllClassifiers(projectId);
  const classifierInfo = ClassifierHooks.useGetClassifierInfo();
  const classifier = classifiers.data?.find((c) => c.id === classifierId);
  const configuredAveraging = classifier?.train_params["averaging"];
  const defaultAveraging =
    savedAveraging ??
    (configuredAveraging === ClassifierAveraging.MICRO || configuredAveraging === ClassifierAveraging.MACRO
      ? configuredAveraging
      : classifierInfo.data?.training_params.averaging);

  // form state
  const {
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<EvaluationSettings>({
    values: defaultAveraging === undefined ? undefined : { averaging: defaultAveraging },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(ClassifierActions.setEvaluationAveraging(getValues("averaging")));
    dispatch(ClassifierActions.previousClassifierDialogStep());
  };
  const { mutate: startClassifierJobMutation, isPending } = ClassifierHooks.useStartClassifierJob();
  const onSubmit = (data: EvaluationSettings) => {
    if (model === undefined || task === undefined || classifierId === undefined) return;
    dispatch(ClassifierActions.setEvaluationAveraging(data.averaging));

    const evalParams: ClassifierEvaluationParams = {
      task_type: task,
      classifier_id: classifierId,
      tag_ids: tagIds,
      user_ids: userIds,
      merge_children_into_parent: mergeChildren,
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
          dispatch(ClassifierActions.setClassifierJobId(jobData.job_id));
          dispatch(ClassifierActions.nextClassifierDialogStep());
        },
      },
    );
  };
  const onError: SubmitErrorHandler<EvaluationSettings> = (data) => console.error(data);

  if (classifierInfo.isError) {
    return <Alert severity="error">Could not load classifier settings: {classifierInfo.error.message}</Alert>;
  }

  if (!classifierInfo.data || classifiers.isLoading) {
    return (
      <Box alignItems="center" display="flex" flexGrow={1} justifyContent="center">
        <CircularProgress aria-label="Loading classifier settings" />
      </Box>
    );
  }

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
