import { FormFreeSolo, FormMenu, FormNumber, FormSwitch, FormText } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { ClassifierAveraging } from "@models/ClassifierAveraging";
import { ClassifierInfo } from "@models/ClassifierInfo";
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
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { SubmitErrorHandler, useForm, useWatch } from "react-hook-form";
import { ClassifierHooks } from "../../../_api/classifierQueryOptions";
import { ClassifierActions, ClassifierTrainingSettings } from "../../../store/classifierSlice";

const precisionOptions = ["32-true", "16-true", "16-mixed", "bf16-true", "bf16-mixed"];

const averagingOptions = [ClassifierAveraging.MICRO, ClassifierAveraging.MACRO];

export function TrainingSettingsStep() {
  const model = useAppSelector((state) => state.classifier.context.model);
  const savedSettings = useAppSelector((state) => state.classifier.drafts.trainingSettings);
  const classifierInfo = ClassifierHooks.useGetClassifierInfo();

  if (classifierInfo.isError) {
    return <Alert severity="error">Could not load classifier settings: {classifierInfo.error.message}</Alert>;
  }

  if (!classifierInfo.data) {
    return (
      <Box alignItems="center" display="flex" flexGrow={1} justifyContent="center">
        <CircularProgress aria-label="Loading classifier settings" />
      </Box>
    );
  }

  return <TrainingSettingsForm classifierInfo={classifierInfo.data} model={model} savedSettings={savedSettings} />;
}

interface TrainingSettingsFormProps {
  classifierInfo: ClassifierInfo;
  model?: ClassifierModel;
  savedSettings?: ClassifierTrainingSettings;
}

function TrainingSettingsForm({ classifierInfo, model, savedSettings }: TrainingSettingsFormProps) {
  const dispatch = useAppDispatch();
  const baseModelOptions =
    model === ClassifierModel.SENTENCE ? classifierInfo.embedding_models : classifierInfo.transformer_models;
  const trainingDefaults = classifierInfo.training_params;

  // form state
  const {
    control,
    getValues,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClassifierTrainingSettings>({
    defaultValues: savedSettings ?? {
      classifier_name: "",
      // default base model depends on the classifier model type
      base_name: baseModelOptions?.[0]?.value ?? "",
      lora_enabled: trainingDefaults.lora_enabled,
      lora_rank: trainingDefaults.lora_rank,
      lora_alpha: trainingDefaults.lora_alpha,
      lora_dropout: trainingDefaults.lora_dropout,
      freeze_base_model: trainingDefaults.lora_enabled ? true : trainingDefaults.freeze_base_model,
      epochs: trainingDefaults.epochs,
      batch_size: trainingDefaults.batch_size,
      early_stopping: trainingDefaults.early_stopping,
      early_stopping_patience: trainingDefaults.early_stopping_patience,
      train_test_split: trainingDefaults.train_test_split,
      base_learning_rate: trainingDefaults.base_learning_rate,
      head_learning_rate: trainingDefaults.head_learning_rate,
      warmup_fraction: trainingDefaults.warmup_fraction,
      weight_decay: trainingDefaults.weight_decay,
      dropout: trainingDefaults.dropout,
      chunk_size: trainingDefaults.chunk_size,
      precision: trainingDefaults.precision,
      averaging: trainingDefaults.averaging,
    },
  });

  // dialog actions
  const handlePrev = () => {
    dispatch(ClassifierActions.setTrainingSettings(getValues()));
    dispatch(ClassifierActions.previousClassifierDialogStep());
  };
  const onSubmit = (data: ClassifierTrainingSettings) => {
    dispatch(ClassifierActions.setTrainingSettings(data));
    dispatch(ClassifierActions.nextClassifierDialogStep());
  };
  const onError: SubmitErrorHandler<ClassifierTrainingSettings> = (data) => console.error(data);
  const earlyStoppingEnabled = useWatch({ control, name: "early_stopping" });
  const loraEnabled = useWatch({ control, name: "lora_enabled" });
  const baseModelFrozen = useWatch({ control, name: "freeze_base_model" });

  const handleLoraEnabledChange = (enabled: boolean) => {
    if (enabled) {
      setValue("freeze_base_model", true, { shouldDirty: true, shouldValidate: true });
    }
  };

  const handleFreezeBaseModelChange = (frozen: boolean) => {
    if (!frozen) {
      setValue("lora_enabled", false, { shouldDirty: true, shouldValidate: true });
    }
  };

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
                name="classifier_name"
                control={control}
                rules={{ required: "Name is required" }}
                textFieldProps={{
                  label: "Name",
                  error: Boolean(errors.classifier_name),
                  helperText: <ErrorMessage errors={errors} name="classifier_name" />,
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
                name="base_name"
                control={control}
                rules={{ required: "Base Model is required" }}
                options={baseModelOptions ?? []}
                textFieldProps={{
                  label: "Base Model",
                  error: Boolean(errors.base_name),
                  helperText: <ErrorMessage errors={errors} name="base_name" />,
                  variant: "filled",
                }}
              />
            </FormItem>
            <FormItem
              title="Freeze Base Model"
              subtitle={
                loraEnabled
                  ? "LoRA requires a frozen base model. Turning this off also disables LoRA."
                  : "Train only the classifier head instead of updating the pretrained base model."
              }
            >
              <FormSwitch
                name="freeze_base_model"
                control={control}
                switchProps={{ size: "medium", color: "primary" }}
                boxProps={{ sx: { ml: 2 } }}
                onValueChange={handleFreezeBaseModelChange}
              />
            </FormItem>
            <FormItem
              title="LoRA"
              subtitle="Train low-rank adapters. Enabling LoRA automatically freezes the pretrained base model."
            >
              <FormSwitch
                name="lora_enabled"
                control={control}
                switchProps={{ size: "medium", color: "primary" }}
                boxProps={{ sx: { ml: 2 } }}
                onValueChange={handleLoraEnabledChange}
              />
            </FormItem>
            <Box
              sx={{
                borderLeft: 3,
                borderColor: loraEnabled ? "primary.main" : "divider",
                pl: 1,
                opacity: loraEnabled ? 1 : 0.6,
                transition: (theme) =>
                  theme.transitions.create(["border-color", "opacity"], {
                    duration: theme.transitions.duration.short,
                  }),
              }}
            >
              <Stack spacing={2}>
                <FormItem title="LoRA Rank" subtitle="Set the capacity of the low-rank update matrices.">
                  <FormNumber
                    name="lora_rank"
                    control={control}
                    rules={{ required: "Required", min: { value: 1, message: "Must be at least 1" } }}
                    textFieldProps={{
                      label: "Rank",
                      variant: "filled",
                      inputProps: { min: 1, step: 1 },
                      size: "small",
                      fullWidth: true,
                      disabled: !loraEnabled,
                      error: Boolean(errors.lora_rank),
                      helperText: <ErrorMessage errors={errors} name="lora_rank" />,
                    }}
                  />
                </FormItem>
                <FormItem title="LoRA Alpha" subtitle="Set the scaling factor applied to LoRA updates.">
                  <FormNumber
                    name="lora_alpha"
                    control={control}
                    rules={{ required: "Required", min: { value: 1, message: "Must be at least 1" } }}
                    textFieldProps={{
                      label: "Alpha",
                      variant: "filled",
                      inputProps: { min: 1, step: 1 },
                      size: "small",
                      fullWidth: true,
                      disabled: !loraEnabled,
                      error: Boolean(errors.lora_alpha),
                      helperText: <ErrorMessage errors={errors} name="lora_alpha" />,
                    }}
                  />
                </FormItem>
                <FormItem title="LoRA Dropout" subtitle="Set the dropout probability inside LoRA layers.">
                  <FormNumber
                    name="lora_dropout"
                    control={control}
                    rules={{
                      required: "Required",
                      min: { value: 0, message: "Must be at least 0" },
                      max: { value: 0.99, message: "Must be below 1" },
                    }}
                    textFieldProps={{
                      label: "LoRA Dropout",
                      variant: "filled",
                      inputProps: { min: 0, max: 0.99, step: 0.01 },
                      size: "small",
                      fullWidth: true,
                      disabled: !loraEnabled,
                      error: Boolean(errors.lora_dropout),
                      helperText: <ErrorMessage errors={errors} name="lora_dropout" />,
                    }}
                  />
                </FormItem>
              </Stack>
            </Box>
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
                name="early_stopping"
                control={control}
                switchProps={{ size: "medium", color: "primary" }}
                boxProps={{ sx: { ml: 2 } }}
              />
            </FormItem>
            <FormItem
              title="Early Stopping Patience"
              subtitle="Choose how many validation epochs without improvement are allowed before training stops."
            >
              <FormNumber
                name="early_stopping_patience"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 0, message: "Must be at least 0" },
                  max: { value: 100, message: "Must be at most 100" },
                }}
                textFieldProps={{
                  label: "Patience",
                  variant: "filled",
                  inputProps: { min: 0, max: 100, step: 1 },
                  size: "small",
                  fullWidth: true,
                  disabled: !earlyStoppingEnabled,
                }}
              />
            </FormItem>
            <FormItem
              title="Train/Validation Split"
              subtitle="Choose between 10% and 50% of the selected data for validation."
            >
              <FormNumber
                name="train_test_split"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 0.1, message: "Must be at least 0.1" },
                  max: { value: 0.5, message: "Must be at most 0.5" },
                  validate: (value) => Number.isInteger(Number(value) * 10) || "Must use increments of 0.1",
                }}
                textFieldProps={{
                  label: "Validation Fraction",
                  variant: "filled",
                  inputProps: { min: 0.1, max: 0.5, step: 0.1 },
                  size: "small",
                  fullWidth: true,
                  error: Boolean(errors.train_test_split),
                  helperText: <ErrorMessage errors={errors} name="train_test_split" />,
                }}
              />
            </FormItem>
            <FormItem title="Batch Size" subtitle="Choose the batch size for training.">
              <FormNumber
                name="batch_size"
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
            <FormItem
              title="Base Model Learning Rate"
              subtitle={
                baseModelFrozen
                  ? "Not used while the pretrained base model is frozen."
                  : "Set the peak learning rate for fine-tuning the pretrained base model."
              }
            >
              <FormNumber
                name="base_learning_rate"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 1e-7, message: "Must be at least 0.0000001" },
                  max: { value: 1, message: "Must be at most 1" },
                }}
                textFieldProps={{
                  label: "Base Learning Rate",
                  variant: "filled",
                  inputProps: {
                    min: 0,
                    max: 1,
                    step: 1e-6,
                  },
                  size: "small",
                  fullWidth: true,
                  disabled: baseModelFrozen,
                  error: Boolean(errors.base_learning_rate),
                  helperText: <ErrorMessage errors={errors} name="base_learning_rate" />,
                }}
              />
            </FormItem>
            <FormItem
              title={loraEnabled ? "Head and LoRA Learning Rate" : "Classifier Head Learning Rate"}
              subtitle={
                loraEnabled
                  ? "Set the peak learning rate shared by the classifier head and LoRA adapter parameters."
                  : "Set the peak learning rate for the classifier-specific layers."
              }
            >
              <FormNumber
                name="head_learning_rate"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 1e-7, message: "Must be at least 0.0000001" },
                  max: { value: 1, message: "Must be at most 1" },
                }}
                textFieldProps={{
                  label: loraEnabled ? "Head and LoRA Learning Rate" : "Head Learning Rate",
                  variant: "filled",
                  inputProps: {
                    min: 0,
                    max: 1,
                    step: 1e-5,
                  },
                  size: "small",
                  fullWidth: true,
                  error: Boolean(errors.head_learning_rate),
                  helperText: <ErrorMessage errors={errors} name="head_learning_rate" />,
                }}
              />
            </FormItem>
            <FormItem
              title="Warmup Fraction"
              subtitle="Choose the fraction of optimizer steps used to increase both learning rates from zero to their peaks. The rates then decay linearly to zero."
            >
              <FormNumber
                name="warmup_fraction"
                control={control}
                rules={{
                  required: "Required",
                  min: { value: 0, message: "Must be at least 0" },
                  max: { value: 0.99, message: "Must be below 1" },
                }}
                textFieldProps={{
                  label: "Warmup Fraction",
                  variant: "filled",
                  inputProps: { min: 0, max: 0.99, step: 0.05 },
                  size: "small",
                  fullWidth: true,
                  error: Boolean(errors.warmup_fraction),
                  helperText: <ErrorMessage errors={errors} name="warmup_fraction" />,
                }}
              />
            </FormItem>
            <FormItem title="Weight Decay" subtitle="Choose the weight decay for training.">
              <FormNumber
                name="weight_decay"
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
                name="chunk_size"
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
