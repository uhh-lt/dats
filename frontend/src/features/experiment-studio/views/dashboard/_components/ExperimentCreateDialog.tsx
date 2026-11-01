import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormMenu, FormText } from "@components/form-inputs";
import { CodeTable } from "@core/code";
import { createEmptyFilter, MyFilter } from "@core/filter";
import { ProjectMetadataHooks } from "@core/project-metadata";
import { TASK_TYPE_LABELS } from "@core/prompt";
import { SdocFilterActions, SdocReduxFilterTable } from "@core/source-document";
import { UserHooks, UserRenderer } from "@core/user";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { IDListOperator } from "@models/IDListOperator";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SdocColumns } from "@models/SdocColumns";
import { TaskType } from "@models/TaskType";
import FilterListIcon from "@mui/icons-material/FilterList";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  Divider,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
} from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { closeOnEscape } from "@utils/dialogUtils";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Control, FieldErrors, SubmitErrorHandler, SubmitHandler, useForm, useWatch } from "react-hook-form";
import { ExperimentHooks } from "../../../api/experimentHooks";
import { experimentQueries } from "../../../api/experimentQueries";

// the redux filter of the document table of this dialog
const FILTER_NAME = "experimentDocuments";

// the tasks an experiment can compare: the annotation tasks
const EXPERIMENT_TASK_TYPES = [TaskType.ANNOTATION, TaskType.SENTENCE_ANNOTATION];

const STEPS = ["Settings", "Select codes", "Select documents"];

type ExperimentCreateValues = {
  name: string;
  taskType: TaskType;
  goldUserId: number | "";
};

const selectedIds = (selection: MRT_RowSelectionState) =>
  Object.entries(selection)
    .filter(([, selected]) => selected)
    .map(([id]) => parseInt(id));

interface ExperimentCreateDialogProps {
  projectId: number;
}

/** A wizard that creates an experiment: 1. name, task and gold annotator, 2. the codes, 3. the documents. */
export function ExperimentCreateDialog({ projectId }: ExperimentCreateDialogProps) {
  // dialog state: the step and the selections of the tables
  const [step, setStep] = useState(0);
  const [codeSelection, setCodeSelection] = useState<MRT_RowSelectionState>({});
  const [sdocSelection, setSdocSelection] = useState<MRT_RowSelectionState>({});
  const handleDialogClose = useCallback(() => {
    setStep(0);
    setCodeSelection({});
    setSdocSelection({});
  }, []);
  const { isOpen, open: handleOpen, close: handleClose } = useDialog({ onClose: handleDialogClose });
  const selectedCodeIds = useMemo(() => selectedIds(codeSelection), [codeSelection]);
  const selectedSdocIds = useMemo(() => selectedIds(sdocSelection), [sdocSelection]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form + reset form when dialog opens
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<ExperimentCreateValues>();
  useEffect(() => {
    if (isOpen) reset({ name: "", taskType: TaskType.ANNOTATION, goldUserId: "" });
  }, [isOpen, reset]);

  // form actions: the first two steps only advance, the last one creates the experiment
  const navigate = useNavigate();
  const { mutate: createExperimentMutation, isPending } = ExperimentHooks.useCreateExperiment();
  const handleExperimentCreation = useCallback<SubmitHandler<ExperimentCreateValues>>(
    (data) => {
      if (step === 0) {
        setStep(1);
        return;
      }
      if (step === 1) {
        if (selectedCodeIds.length > 0) setStep(2);
        return;
      }
      if (data.goldUserId === "" || selectedCodeIds.length === 0 || selectedSdocIds.length === 0) return;
      createExperimentMutation(
        {
          requestBody: {
            project_id: projectId,
            name: data.name,
            task_type: data.taskType,
            gold_user_id: data.goldUserId,
            code_ids: selectedCodeIds,
            sdoc_ids: selectedSdocIds,
          },
        },
        {
          onSuccess: (experiment) => {
            handleClose();
            navigate({
              to: "/project/$projectId/experiments/$experimentId",
              params: { projectId, experimentId: experiment.id },
            });
          },
        },
      );
    },
    [createExperimentMutation, handleClose, navigate, projectId, selectedCodeIds, selectedSdocIds, step],
  );
  const handleError: SubmitErrorHandler<ExperimentCreateValues> = (data) => console.error(data);
  const handleBack = useCallback(() => setStep((current) => current - 1), []);

  return (
    <>
      <Button variant="contained" onClick={handleOpen}>
        Create New Experiment
      </Button>
      <Dialog
        open={isOpen}
        onClose={closeOnEscape(handleClose)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handleExperimentCreation, handleError)}
        slotProps={{ paper: { sx: { height: "90vh" } } }}
      >
        <DATSDialogHeader
          title="Create a new experiment"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <Stepper activeStep={step} sx={{ p: 2 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Divider />
        <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100", minHeight: 0 }}>
          {step === 0 && <SettingsStep projectId={projectId} control={control} errors={errors} />}
          {step === 1 && (
            <CodeSelectionStep projectId={projectId} selection={codeSelection} onSelectionChange={setCodeSelection} />
          )}
          {step === 2 && (
            <DocumentSelectionStep
              projectId={projectId}
              control={control}
              selection={sdocSelection}
              onSelectionChange={setSdocSelection}
            />
          )}
        </Stack>
        <Divider />
        <DialogActions>
          <Box flexGrow={1} />
          {step === 0 ? <Button onClick={handleClose}>Close</Button> : <Button onClick={handleBack}>Back</Button>}
          {step < 2 ? (
            <Button variant="contained" type="submit" disabled={step === 1 && selectedCodeIds.length === 0}>
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              type="submit"
              disabled={selectedSdocIds.length === 0}
              loading={isPending}
              loadingPosition="start"
            >
              Create experiment with {selectedSdocIds.length} document(s)
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

interface SettingsStepProps {
  projectId: number;
  control: Control<ExperimentCreateValues>;
  errors: FieldErrors<ExperimentCreateValues>;
}

/** Step 1: the name (unique in the project), the task and the gold annotator. */
function SettingsStep({ projectId, control, errors }: SettingsStepProps) {
  const users = UserHooks.useGetAllUsers();
  const experiments = useQuery(experimentQueries.byProject(projectId));
  const takenNames = useMemo(
    () => new Set(Object.values(experiments.data ?? {}).map((experiment) => experiment.name)),
    [experiments.data],
  );

  return (
    <>
      <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
        An experiment fixes the task, the gold annotator, the codes and the documents. Every run of the experiment
        writes into its own virtual user and is evaluated against the gold annotator.
      </Alert>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            <FormText
              name="name"
              control={control}
              rules={{
                required: "Name is required",
                validate: (name) =>
                  !takenNames.has(String(name).trim()) || "The project already has an experiment with this name",
              }}
              textFieldProps={{
                label: "Name",
                placeholder: "e.g. ExperimentA",
                autoFocus: true,
                error: Boolean(errors.name),
                helperText: errors.name?.message || "Runs write into the virtual users <name>-<run name>",
              }}
            />
            <FormMenu
              name="taskType"
              control={control}
              rules={{ required: "Task is required" }}
              textFieldProps={{
                label: "Task",
                error: Boolean(errors.taskType),
                helperText: <ErrorMessage errors={errors} name="taskType" />,
              }}
            >
              {EXPERIMENT_TASK_TYPES.map((taskType) => (
                <MenuItem key={taskType} value={taskType}>
                  {TASK_TYPE_LABELS[taskType]}
                </MenuItem>
              ))}
            </FormMenu>
            <FormMenu
              name="goldUserId"
              control={control}
              rules={{ required: "Gold annotator is required" }}
              textFieldProps={{
                label: "Gold annotator",
                error: Boolean(errors.goldUserId),
                helperText: errors.goldUserId?.message || "Must have annotated every document of the experiment",
              }}
            >
              {!users.data?.length && (
                <MenuItem value="" disabled>
                  Loading annotators...
                </MenuItem>
              )}
              {users.data?.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <UserRenderer user={user} />
                </MenuItem>
              ))}
            </FormMenu>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}

interface CodeSelectionStepProps {
  projectId: number;
  selection: MRT_RowSelectionState;
  onSelectionChange: React.Dispatch<React.SetStateAction<MRT_RowSelectionState>>;
}

/** Step 2: the codes of the experiment. */
function CodeSelectionStep({ projectId, selection, onSelectionChange }: CodeSelectionStepProps) {
  return (
    <>
      <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
        Choose the codes of the experiment. Only prompt versions that select exactly these codes can run in the
        experiment, and only these codes are evaluated.
      </Alert>
      <Card className="myFlexContainer myFlexFillAllContainer" variant="outlined">
        <CodeTable projectId={projectId} rowSelectionModel={selection} onRowSelectionChange={onSelectionChange} />
      </Card>
    </>
  );
}

interface DocumentSelectionStepProps {
  projectId: number;
  control: Control<ExperimentCreateValues>;
  selection: MRT_RowSelectionState;
  onSelectionChange: React.Dispatch<React.SetStateAction<MRT_RowSelectionState>>;
}

/** Step 3: the documents of the experiment, which the gold annotator must have annotated. */
function DocumentSelectionStep({ projectId, control, selection, onSelectionChange }: DocumentSelectionStepProps) {
  const goldUserId = useWatch({ control, name: "goldUserId" });

  // the documents are checked against the "Annotated by" filter, so offer to filter by the gold annotator
  const dispatch = useAppDispatch();
  const handleFilterByGold = useCallback(() => {
    if (goldUserId === "") return;
    const filter: MyFilter<SdocColumns> = {
      ...createEmptyFilter<SdocColumns>("root"),
      items: [
        {
          id: crypto.randomUUID(),
          column: SdocColumns.SD_USER_ID_LIST,
          operator: IDListOperator.ID_LIST_CONTAINS,
          value: goldUserId,
        },
      ],
    };
    dispatch(SdocFilterActions.onChangeFilter({ filterName: FILTER_NAME, filter }));
  }, [dispatch, goldUserId]);

  return (
    <>
      <Alert
        variant="standard"
        severity="info"
        sx={{ border: "1px solid", borderColor: "info.main" }}
        action={
          <Button
            size="small"
            color="inherit"
            startIcon={<FilterListIcon />}
            onClick={handleFilterByGold}
            disabled={goldUserId === ""}
          >
            Filter by gold annotator
          </Button>
        }
      >
        Choose the documents of the experiment. <b>Every document must be annotated by the gold annotator.</b>
      </Alert>
      <Card className="myFlexContainer myFlexFillAllContainer" variant="outlined">
        <ExperimentDocumentTable projectId={projectId} selection={selection} onSelectionChange={onSelectionChange} />
      </Card>
    </>
  );
}

interface ExperimentDocumentTableProps {
  projectId: number;
  selection: MRT_RowSelectionState;
  onSelectionChange: React.Dispatch<React.SetStateAction<MRT_RowSelectionState>>;
}

/** The documents of the project with the usual filters; the metadata columns are hidden at first. */
function ExperimentDocumentTable(props: ExperimentDocumentTableProps) {
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();
  if (metadata.isSuccess) return <ExperimentDocumentTableContent metadata={metadata.data} {...props} />;
  if (metadata.isError) return <Alert severity="error">{metadata.error.message}</Alert>;
  return <CircularProgress />;
}

function ExperimentDocumentTableContent({
  projectId,
  selection,
  onSelectionChange,
  metadata,
}: ExperimentDocumentTableProps & { metadata: ProjectMetadataRead[] }) {
  const [fetchSize, setFetchSize] = useState(100);
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    Object.fromEntries(metadata.map((field) => [field.id, false])),
  );

  return (
    <SdocReduxFilterTable
      projectId={projectId}
      filterName={FILTER_NAME}
      rowSelectionModel={selection}
      onRowSelectionChange={onSelectionChange}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel}
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
    />
  );
}
