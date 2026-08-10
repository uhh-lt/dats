import { FormFreeSolo, FormMenu, FormNumber, FormSwitch, FormText } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { ClassifierAveraging } from "@models/ClassifierAveraging";
import { ClassifierModel } from "@models/ClassifierModel";
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
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { ClassifierActions } from "../../../store/classifierSlice";
import { embeddingModelOptions, transformerModelOptions } from "./baseModelOptions";

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
  chunkSize: number;
  precision: "32-true" | "16-true" | "16-mixed" | "bf16-true" | "bf16-mixed";
  // evaluation settings
  averaging: ClassifierAveraging;
}

const adapterOptions = ["No Adapter", "LoRA", "LoHa", "AdaLoRA", "RandLora"];

const precisionOptions = ["32-true", "16-true", "16-mixed", "bf16-true", "bf16-mixed"];

const averagingOptions = [ClassifierAveraging.MICRO, ClassifierAveraging.MACRO];

export function TrainingSettingsStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.classifierModel);
  const dispatch = useAppDispatch();

  // form state
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TrainingSettings>({
    defaultValues: {
      classifierName: "",
      // default base model depends on the classifier model type
      baseModelName:
        model === ClassifierModel.SENTENCE ? "Alibaba-NLP/gte-modernbert-base" : "answerdotai/ModernBERT-base",
      adapterName: "No Adapter",
      batchSize: 8,
      epochs: 10,
      earlyStopping: true,
      learningRate: 0.001,
      weightDecay: 0.01,
      dropout: 0.3,
      chunkSize: 1024,
      precision: "bf16-mixed",
      averaging: ClassifierAveraging.MICRO,
    },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(ClassifierActions.previousClassifierDialogStep());
  };
  const onSubmit = (data: TrainingSettings) => {
    dispatch(
      ClassifierActions.onClassifierDialogSetTrainingSettings({
        classifierName: data.classifierName,
        baseModelName: data.baseModelName,
        adapterName: data.adapterName,
        batchSize: data.batchSize,
        epochs: data.epochs,
        earlyStopping: data.earlyStopping,
        learningRate: data.learningRate,
        weightDecay: data.weightDecay,
        dropout: data.dropout,
        chunkSize: data.chunkSize,
        precision: data.precision,
        averaging: data.averaging,
      }),
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
            <FormItem title="Chunk Size" subtitle="Choose the chunk size for training.">
              <FormNumber
                name="chunkSize"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 128, message: "Must be at least 128" },
                  max: { value: 8192, message: "Must be at most 8192" },
                }}
                textFieldProps={{
                  label: "Chunk Size",
                  variant: "filled",
                  inputProps: { min: 128, max: 8192, step: 128 },
                  size: "small",
                  fullWidth: true,
                }}
              />
            </FormItem>
            <FormItem title="Precision" subtitle="Choose a precision for training">
              <FormMenu
                name="precision"
                control={control}
                textFieldProps={{
                  label: "Precision",
                  error: Boolean(errors.precision),
                  helperText: <ErrorMessage errors={errors} name="precision" />,
                  variant: "filled",
                  fullWidth: true,
                }}
              >
                {precisionOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </FormMenu>
            </FormItem>
            <FormItem
              title="Averaging"
              subtitle="Choose the averaging strategy for evaluation metrics (precision, recall, F1)."
            >
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
            </FormItem>
          </FormBox>
        </Stack>
      </Stack>
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handlePrev}>Back</Button>
        <Button type="submit">Next</Button>
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

function FormItem({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
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
