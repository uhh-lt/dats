import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  DialogActions,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import ClassifierHooks from "../../../api/ClassifierHooks.ts";
import { ClassifierInferenceParams } from "../../../api/openapi/models/ClassifierInferenceParams.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import FormSwitch from "../../../components/FormInputs/FormSwitch.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface InferenceSettings {
  isCool: boolean;
}

function InferenceSettingsStep() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const classifierId = useAppSelector((state) => state.dialog.classifierId);
  const task = useAppSelector((state) => state.dialog.classifierTask);
  const projectId = useAppSelector((state) => state.dialog.classifierProjectId);
  const sdocIds = useAppSelector((state) => state.dialog.classifierSdocIds);
  const dispatch = useAppDispatch();

  // form state
  const { control, handleSubmit } = useForm<InferenceSettings>({
    defaultValues: {
      isCool: false,
    },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(CRUDDialogActions.previousClassifierDialogStep());
  };
  const { mutate: startClassifierJobMutation, isPending } = ClassifierHooks.useStartClassifierJob();
  const onSubmit = (data: InferenceSettings) => {
    if (model === undefined || task === undefined || classifierId === undefined || sdocIds.length === 0) return;

    console.log("Data!", data);

    const inferenceParams: ClassifierInferenceParams = {
      // required
      task_type: task,
      classifier_id: classifierId,
      sdoc_ids: sdocIds,
    };

    startClassifierJobMutation(
      {
        requestBody: {
          model_type: model,
          task_type: task,
          project_id: projectId,
          task_parameters: inferenceParams,
        },
      },
      {
        onSuccess: (data) => {
          dispatch(CRUDDialogActions.onClassifierDialogStartJob(data.job_id));
        },
      },
    );
  };
  const onError: SubmitErrorHandler<InferenceSettings> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)}>
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          This is an info Alert.
        </Alert>
        <Stack spacing={2}>
          <FormBox title="Cool configuration">
            <FormItem title="Coolness" subtitle="Use Coolness?.">
              <FormSwitch
                name="isCool"
                control={control}
                boxProps={{ sx: { ml: 2 } }}
                switchProps={{ size: "medium", color: "primary" }}
              />
            </FormItem>
          </FormBox>
        </Stack>
      </Stack>
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handlePrev}>Back</Button>
        <Button loading={isPending} loadingPosition="start" type="submit">
          Next
        </Button>
      </DialogActions>
    </form>
  );
}

export default InferenceSettingsStep;

function FormBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <CardHeader
        title={title}
        slotProps={{
          title: {
            variant: "h6",
          },
        }}
        sx={{ py: 1 }}
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

function FormItem({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1 }}>
      <Box width="50%">
        <Typography variant="subtitle1" fontWeight={500}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
      <Box width="50%" flexShrink={0}>
        {children}
      </Box>
    </Box>
  );
}
