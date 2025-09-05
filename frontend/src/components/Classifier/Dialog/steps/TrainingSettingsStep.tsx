import { ErrorMessage } from "@hookform/error-message";
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
  Typography,
} from "@mui/material";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import ClassifierHooks from "../../../../api/ClassifierHooks.ts";
import { ClassifierModel } from "../../../../api/openapi/models/ClassifierModel.ts";
import { ClassifierTrainingParams } from "../../../../api/openapi/models/ClassifierTrainingParams.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import FormFreeSolo, { FreeSoloOptions } from "../../../FormInputs/FormFreeSolo.tsx";
import FormMenu from "../../../FormInputs/FormMenu.tsx";
import FormNumber from "../../../FormInputs/FormNumber.tsx";
import FormSwitch from "../../../FormInputs/FormSwitch.tsx";
import FormText from "../../../FormInputs/FormText.tsx";

interface TrainingSettings {
  // required
  classifierName: string;
  baseModelName: string;
  adapterName: string;
  // train settings
  batchSize: number;
  epochs: number;
  earlyStopping: boolean;
  learningRate: number;
  weightDecay: number;
  dropout: number;
  // sequence classification settings
  isBio: boolean;
}

const transformerModelOptions: FreeSoloOptions[] = [
  { value: "answerdotai/ModernBERT-base", label: "ModernBERT-base (EN)" },
  { value: "answerdotai/ModernBERT-large", label: "ModernBERT-large (EN)" },
  { value: "LSX-UniWue/ModernGBERT_134M", label: "ModernGBERT_134M (DE)" },
  { value: "LSX-UniWue/ModernGBERT_1B", label: "ModernGBERT_1B (DE)" },
  { value: "microsoft/mdeberta-v3-base", label: "mdeberta-v3-base (MULTI)" },
];

const embeddingModelOptions: FreeSoloOptions[] = [
  { value: "Alibaba-NLP/gte-modernbert-base", label: "gte-modernbert-base (EN)" },
  { value: "intfloat/multilingual-e5-small", label: "multilingual-e5-small (MULTI)" },
  { value: "intfloat/multilingual-e5-large", label: "multilingual-e5-large (MULTI)" },
  {
    value: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    label: "paraphrase-multilingual-mpnet-base-v2 (MULTI)",
  },
  // { value: "google/embeddinggemma-300m", label: "embeddinggemma-300m (MULTI)" }, TODO: update hf library
  // { value: "jinaai/jina-embeddings-v3", label: "jina-embeddings-v3 (MULTI)" }, TODO: update st library
  // { value: "Qwen/Qwen3-Embedding-0.6B", label: "Qwen3-Embedding-0.6B (MULTI)" }, TODO: update hf library
];

const adapterOptions = ["No Adapter", "LoRA", "LoHa", "AdaLoRA", "RandLora"];

function TrainingSettingsStep() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const task = useAppSelector((state) => state.dialog.classifierTask);
  const projectId = useAppSelector((state) => state.dialog.classifierProjectId);
  const classIds = useAppSelector((state) => state.dialog.classifierClassIds);
  const userIds = useAppSelector((state) => state.dialog.classifierUserIds);
  const tagIds = useAppSelector((state) => state.dialog.classifierTagIds);
  const dispatch = useAppDispatch();

  // form state
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TrainingSettings>({
    defaultValues: {
      classifierName: "",
      baseModelName: "",
      adapterName: "No Adapter",
      batchSize: 4,
      epochs: 10,
      earlyStopping: true,
      learningRate: 0.0001,
      weightDecay: 0.01,
      dropout: 0.2,
      isBio: false,
    },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(CRUDDialogActions.previousClassifierDialogStep());
  };
  const { mutate: startClassifierJobMutation, isPending } = ClassifierHooks.useStartClassifierJob();
  const onSubmit = (data: TrainingSettings) => {
    if (model === undefined || task === undefined) return;

    const trainingParams: ClassifierTrainingParams = {
      task_type: task,
      // required
      classifier_name: data.classifierName,
      base_name: data.baseModelName,
      adapter_name: data.adapterName === "No Adapter" ? null : data.adapterName,
      class_ids: classIds,
      // training data
      tag_ids: tagIds,
      user_ids: userIds,
      // training settings
      batch_size: data.batchSize,
      epochs: data.epochs,
      early_stopping: data.earlyStopping,
      learning_rate: data.learningRate,
      weight_decay: data.weightDecay,
      dropout: data.dropout,
      // specific training settings
      is_bio: data.isBio,
    };

    startClassifierJobMutation(
      {
        requestBody: {
          model_type: model,
          task_type: task,
          project_id: projectId,
          task_parameters: trainingParams,
        },
      },
      {
        onSuccess: (data) => {
          dispatch(CRUDDialogActions.onClassifierDialogStartJob(data.job_id));
        },
      },
    );
  };
  const onError: SubmitErrorHandler<TrainingSettings> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="myFlexContainer myFlexFillAllContainer">
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          Configure the training settings for your classifier. Provide a unique name, select a base model, and adjust
          the training parameters as needed.
        </Alert>
        <Stack spacing={2}>
          <FormBox title="Required configuration">
            <FormItem title="Classifier Name" subtitle="Specify the name of your new classifier.">
              <FormText
                name="classifierName"
                control={control}
                rules={{ required: "Name is required" }}
                textFieldProps={{
                  label: "Name",
                  error: Boolean(errors.classifierName),
                  helperText: <ErrorMessage errors={errors} name="classifierName" />,
                  variant: "filled",
                  fullWidth: true,
                }}
              />
            </FormItem>
            <FormItem
              title="Base Model Name"
              subtitle={
                <>
                  Choose a model that matches the language of your documents or specify HuggingFace model name. Check
                  the{" "}
                  <a href="https://huggingface.co/spaces/mteb/leaderboard" target="_blank">
                    MTEB Benchmark
                  </a>{" "}
                  for best text embedding models!
                </>
              }
            >
              <FormFreeSolo
                name="baseModelName"
                control={control}
                rules={{ required: "Base Model is required" }}
                options={model === ClassifierModel.SENTENCE ? embeddingModelOptions : transformerModelOptions}
                textFieldProps={{
                  label: "Base Model",
                  error: Boolean(errors.baseModelName),
                  helperText: <ErrorMessage errors={errors} name="baseModelName" />,
                  variant: "filled",
                }}
              />
            </FormItem>
            <FormItem title="Adapter Name" subtitle="Choose a PEFT method to optimize number of trainable parameters.">
              <FormMenu
                name="adapterName"
                control={control}
                textFieldProps={{
                  label: "Adapter",
                  error: Boolean(errors.adapterName),
                  helperText: <ErrorMessage errors={errors} name="adapterName" />,
                  variant: "filled",
                  fullWidth: true,
                  disabled: true,
                }}
              >
                {adapterOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </FormMenu>
            </FormItem>
          </FormBox>

          <FormBox title="Expert configuration">
            <FormItem title="Epochs" subtitle="Choose the number of training epochs.">
              <FormNumber
                name="epochs"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 1, message: "Must be at least 1" },
                  max: { value: 100, message: "Must be at most 100" },
                }}
                textFieldProps={{
                  label: "# Epochs",
                  variant: "filled",
                  inputProps: { min: 1, max: 100 },
                  size: "small",
                  fullWidth: true,
                }}
              />
            </FormItem>
            <FormItem title="Early Stopping" subtitle="Enable early stopping to prevent overfitting.">
              <FormSwitch
                name="earlyStopping"
                control={control}
                switchProps={{ size: "medium", color: "primary" }}
                boxProps={{ sx: { ml: 2 } }}
              />
            </FormItem>
            <FormItem title="Batch Size" subtitle="Choose the batch size for training.">
              <FormNumber
                name="batchSize"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 1, message: "Must be at least 1" },
                  max: { value: 64, message: "Must be at most 64" },
                }}
                textFieldProps={{
                  label: "Batch Size",
                  variant: "filled",
                  inputProps: { min: 1, max: 64 },
                  size: "small",
                  fullWidth: true,
                }}
              />
            </FormItem>
            <FormItem title="Learning Rate" subtitle="Choose the learning rate for training.">
              <FormNumber
                name="learningRate"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 1e-7, message: "Must be at least 1e-5" },
                  max: { value: 1, message: "Must be at most 1" },
                }}
                textFieldProps={{
                  label: "Learning Rate",
                  variant: "filled",
                  inputProps: { min: 1e-5, max: 1, step: 1e-5 },
                  size: "small",
                  fullWidth: true,
                }}
              />
            </FormItem>
            <FormItem title="Weight Decay" subtitle="Choose the weight decay for training.">
              <FormNumber
                name="weightDecay"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 0.0, message: "Must be at least 0" },
                  max: { value: 1.0, message: "Must be at most 1" },
                }}
                textFieldProps={{
                  label: "Weight Decay",
                  variant: "filled",
                  inputProps: { min: 0, max: 1, step: 0.01 },
                  size: "small",
                  fullWidth: true,
                }}
              />
            </FormItem>
            <FormItem title="Dropout" subtitle="Choose the dropout rate for training.">
              <FormNumber
                name="dropout"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 0.0, message: "Must be at least 0" },
                  max: { value: 1.0, message: "Must be at most 1" },
                }}
                textFieldProps={{
                  label: "Dropout rate",
                  variant: "filled",
                  inputProps: { min: 0, max: 1, step: 0.01 },
                  size: "small",
                  fullWidth: true,
                }}
              />
            </FormItem>
          </FormBox>
          {model === ClassifierModel.SPAN && (
            <FormBox title="Sequence classification configuration">
              <FormItem
                title="BIO Tagging"
                subtitle="Use BIO tagging for span classification. If false, uses IO tagging."
              >
                <FormSwitch
                  name="isBio"
                  control={control}
                  boxProps={{ sx: { ml: 2 } }}
                  switchProps={{ size: "medium", color: "primary" }}
                  disabled={true}
                />
              </FormItem>
            </FormBox>
          )}
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

export default TrainingSettingsStep;

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

function FormItem({
  title,
  subtitle,
  children,
}: {
  title: string | JSX.Element;
  subtitle: string | JSX.Element;
  children: React.ReactNode;
}) {
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
