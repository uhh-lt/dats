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
  Stack,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import ClassifierHooks from "../../../../api/ClassifierHooks.ts";
import { ClassifierInferenceParams } from "../../../../api/openapi/models/ClassifierInferenceParams.ts";
import { ClassifierModel } from "../../../../api/openapi/models/ClassifierModel.ts";
import SentenceAnnotationHooks from "../../../../api/SentenceAnnotationHooks.ts";
import SpanAnnotationHooks from "../../../../api/SpanAnnotationHooks.ts";
import TagHooks from "../../../../api/TagHooks.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { ASSISTANT_TRAINED_ID } from "../../../../utils/GlobalConstants.ts";
import CodeRenderer from "../../../Code/CodeRenderer.tsx";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import FormSwitch from "../../../FormInputs/FormSwitch.tsx";
import TagRenderer from "../../../Tag/TagRenderer.tsx";

interface InferenceSettings {
  keepExisting: boolean;
}

const useCountBySdocsAndUser = (model: ClassifierModel) => {
  switch (model) {
    case ClassifierModel.DOCUMENT:
      return TagHooks.useCountBySdocsAndUser;
    case ClassifierModel.SENTENCE:
      return SentenceAnnotationHooks.useCountBySdocsAndUser;
    case ClassifierModel.SPAN:
      return SpanAnnotationHooks.useCountBySdocsAndUser;
  }
};

function InferenceSettingsStep() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const classifierId = useAppSelector((state) => state.dialog.classifierId);
  const task = useAppSelector((state) => state.dialog.classifierTask);
  const projectId = useAppSelector((state) => state.dialog.classifierProjectId);
  const sdocIds = useAppSelector((state) => state.dialog.classifierSdocIds);
  const classIds = useAppSelector((state) => state.dialog.classifierClassIds);
  const dispatch = useAppDispatch();

  // count existing classes by that user
  const { mutate: countMutation, data: countData, isSuccess, isError, isPending } = useCountBySdocsAndUser(model!)();
  useEffect(() => {
    countMutation({
      userId: ASSISTANT_TRAINED_ID,
      requestBody: {
        sdoc_ids: sdocIds,
        class_ids: classIds,
      },
    });
  }, [countMutation, sdocIds, classIds]);

  console.log("Count data:", countData);

  // form state
  const { control, handleSubmit } = useForm<InferenceSettings>({
    defaultValues: {
      keepExisting: true,
    },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(CRUDDialogActions.previousClassifierDialogStep());
  };
  const { mutate: startClassifierJobMutation, isPending: isStartJobPending } = ClassifierHooks.useStartClassifierJob();
  const onSubmit = (data: InferenceSettings) => {
    if (model === undefined || task === undefined || classifierId === undefined || sdocIds.length === 0) return;

    const inferenceParams: ClassifierInferenceParams = {
      // required
      task_type: task,
      classifier_id: classifierId,
      sdoc_ids: sdocIds,
      // inference settings
      delete_existing_work: !data.keepExisting,
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
          <FormBox title="Existing Annotations">
            {isPending ? (
              <CircularProgress size={24} />
            ) : isError ? (
              <Alert severity="error">Failed to load existing annotations.</Alert>
            ) : isSuccess && Object.entries(countData).length === 0 ? (
              <Typography>There are no existing annotations. You can skip this step!</Typography>
            ) : isSuccess && Object.entries(countData).length > 0 ? (
              <Stack>
                <Typography mb={1.5}>
                  Some documents were already{" "}
                  {model === ClassifierModel.DOCUMENT ? "tagged" : "annotated  by a classifier"}:
                </Typography>
                <Stack spacing={1} pl={2} mb={4}>
                  {Object.entries(countData).map(([classId, count]) => (
                    <Stack direction="row" key={classId}>
                      {model === ClassifierModel.DOCUMENT ? (
                        <TagRenderer tag={parseInt(classId)} />
                      ) : (
                        <CodeRenderer code={parseInt(classId)} />
                      )}
                      : {count}
                    </Stack>
                  ))}
                </Stack>
                <FormItem
                  title="Deletion Strategy"
                  subtitle={`Keep existing ${model === ClassifierModel.DOCUMENT ? "tags" : "annotations"}?`}
                >
                  <FormSwitch
                    name="keepExisting"
                    control={control}
                    boxProps={{ sx: { ml: 2 } }}
                    switchProps={{ size: "medium", color: "primary" }}
                  />
                </FormItem>
              </Stack>
            ) : null}
          </FormBox>
        </Stack>
      </Stack>
      <Divider />
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handlePrev}>Back</Button>
        <Button loading={isStartJobPending} loadingPosition="start" type="submit">
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
