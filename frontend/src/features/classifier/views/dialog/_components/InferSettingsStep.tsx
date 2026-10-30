import { FormSwitch } from "@components/form-inputs";
import { useAuth } from "@core/auth";
import { CodeRenderer } from "@core/code";
import { SentenceAnnotationHooks } from "@core/sentence-annotation";
import { SpanAnnotationHooks } from "@core/span-annotation";
import { TagHooks, TagRenderer } from "@core/tag";
import { AnnotateAsChoice, AnnotateAsSelector, suggestVirtualAnnotatorName, UserHooks } from "@core/user";
import { ClassifierInferenceParams } from "@models/ClassifierInferenceParams";
import { ClassifierModel } from "@models/ClassifierModel";
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
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useEffect, useState } from "react";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { ClassifierHooks } from "../../../api/classifierHooks";
import { ClassifierActions } from "../../../store/classifierSlice";

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

export function InferenceSettingsStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.context.model);
  const classifierId = useAppSelector((state) => state.classifier.context.classifierId);
  const task = useAppSelector((state) => state.classifier.context.task);
  const projectId = useAppSelector((state) => state.classifier.context.projectId);
  const sdocIds = useAppSelector((state) => state.classifier.dataset.sourceDocumentIds);
  const classIds = useAppSelector((state) => state.classifier.dataset.classIds);
  const keepExisting = useAppSelector((state) => state.classifier.drafts.inferenceKeepExisting);
  const dispatch = useAppDispatch();

  // span and sentence classifiers write into a virtual annotator: an existing one or a new one (default: the next
  // free Classifier-Run<n>); document classifiers assign tags, which belong to no user
  const { user } = useAuth();
  const isAnnotationModel = model !== ClassifierModel.DOCUMENT;
  const virtualAnnotators = UserHooks.useGetVirtualAnnotators();
  const [annotateAsChoice, setAnnotateAsChoice] = useState<AnnotateAsChoice | null | undefined>(undefined);
  const annotateAs: AnnotateAsChoice | null =
    annotateAsChoice !== undefined
      ? annotateAsChoice
      : virtualAnnotators.data
        ? { newName: suggestVirtualAnnotatorName("Classifier", virtualAnnotators.data) }
        : null;
  const annotatorId = annotateAs && "userId" in annotateAs ? annotateAs.userId : undefined;
  // a new virtual annotator has no annotations yet
  const countUserId = isAnnotationModel ? annotatorId : user?.id;

  // count existing classes by that user
  const { mutate: countMutation, data: countData, isSuccess, isError, isPending } = useCountBySdocsAndUser(model!)();
  useEffect(() => {
    if (countUserId === undefined) return;
    countMutation({
      userId: countUserId,
      requestBody: {
        sdoc_ids: sdocIds,
        class_ids: classIds,
      },
    });
  }, [countMutation, countUserId, sdocIds, classIds]);

  // form state
  const { control, getValues, handleSubmit } = useForm<InferenceSettings>({
    defaultValues: {
      keepExisting,
    },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(ClassifierActions.setInferenceKeepExisting(getValues("keepExisting")));
    dispatch(ClassifierActions.previousClassifierDialogStep());
  };
  const { mutate: startClassifierJobMutation, isPending: isStartJobPending } = ClassifierHooks.useStartClassifierJob();
  const { mutate: createVirtualAnnotatorMutation, isPending: isCreatePending } = UserHooks.useCreateVirtualAnnotator();
  const startJob = (data: InferenceSettings, annotatorId: number | null) => {
    if (model === undefined || task === undefined || classifierId === undefined || sdocIds.length === 0) return;
    dispatch(ClassifierActions.setInferenceKeepExisting(data.keepExisting));

    const inferenceParams: ClassifierInferenceParams = {
      // required
      task_type: task,
      classifier_id: classifierId,
      sdoc_ids: sdocIds,
      // the virtual annotator span and sentence classifiers write into
      annotator_id: annotatorId,
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
          dispatch(ClassifierActions.setClassifierJobId(data.job_id));
          dispatch(ClassifierActions.nextClassifierDialogStep());
        },
      },
    );
  };
  const onSubmit = (data: InferenceSettings) => {
    if (!isAnnotationModel) return startJob(data, null);
    if (!annotateAs) return;
    if ("userId" in annotateAs) return startJob(data, annotateAs.userId);
    createVirtualAnnotatorMutation(
      { projectId, requestBody: { name: annotateAs.newName } },
      { onSuccess: (annotator) => startJob(data, annotator.id) },
    );
  };
  const onError: SubmitErrorHandler<InferenceSettings> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="myFlexContainer myFlexFillAllContainer">
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          Decide how to handle existing {model === ClassifierModel.DOCUMENT ? "tags" : "annotations"} on the selected
          documents (if there are any).
        </Alert>
        <Stack spacing={2}>
          {isAnnotationModel && (
            <FormBox title="Annotate as">
              <Typography>
                The classifier writes its annotations into a virtual annotator, never into your annotations. Choose a
                new one to keep this run apart from earlier runs.
              </Typography>
              <AnnotateAsSelector value={annotateAs} onChange={setAnnotateAsChoice} />
            </FormBox>
          )}
          <FormBox title="Existing Annotations">
            {countUserId === undefined ? (
              <Typography>The new virtual annotator has no annotations yet.</Typography>
            ) : isPending ? (
              <CircularProgress size={24} />
            ) : isError ? (
              <Alert severity="error">Failed to load existing annotations.</Alert>
            ) : isSuccess && Object.entries(countData).length === 0 ? (
              <Typography>There are no existing annotations. You can skip this step!</Typography>
            ) : isSuccess && Object.entries(countData).length > 0 ? (
              <Stack>
                <Typography mb={1.5}>
                  Some documents were already{" "}
                  {model === ClassifierModel.DOCUMENT ? "tagged" : "annotated by this virtual annotator"}:
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
        <Button
          loading={isStartJobPending || isCreatePending}
          loadingPosition="start"
          type="submit"
          disabled={isAnnotationModel && annotateAs === null}
        >
          Next
        </Button>
      </DialogActions>
    </form>
  );
}

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
