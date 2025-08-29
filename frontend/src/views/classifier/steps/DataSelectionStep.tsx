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
} from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import ClassifierHooks from "../../../api/ClassifierHooks.ts";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { ClassifierEvaluationParams } from "../../../api/openapi/models/ClassifierEvaluationParams.ts";
import { ClassifierInferenceParams } from "../../../api/openapi/models/ClassifierInferenceParams.ts";
import { ClassifierModel } from "../../../api/openapi/models/ClassifierModel.ts";
import { ClassifierTask } from "../../../api/openapi/models/ClassifierTask.ts";
import { ClassifierTrainingParams } from "../../../api/openapi/models/ClassifierTrainingParams.ts";
import { ElasticSearchHit } from "../../../api/openapi/models/ElasticSearchHit.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { FilterTableToolbarProps } from "../../../components/FilterTable/FilterTableToolbarProps.ts";
import SdocTable from "../../../components/SourceDocument/SdocTable/SdocTable.tsx";
import UserSelectorMulti from "../../../components/User/UserSelectorMulti.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ClassifierDataPlot from "../plots/ClassifierDataPlot.tsx";

function DataSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const task = useAppSelector((state) => state.dialog.classifierTask);
  const classifierId = useAppSelector((state) => state.dialog.classifierId);
  const projectId = useAppSelector((state) => state.dialog.classifierProjectId);
  const classIds = useAppSelector((state) => state.dialog.classifierClassIds);
  const userIds = useAppSelector((state) => state.dialog.classifierUserIds);
  const sdocIds = useAppSelector((state) => state.dialog.classifierSdocIds);

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();
  const datasetStats = ClassifierHooks.useComputeDatasetStatistics();
  console.log("datasetStats", datasetStats.data);

  // selection actions
  const dispatch = useAppDispatch();
  const handleUserSelection = (userIds: number[]) => {
    dispatch(CRUDDialogActions.onClassifierDialogSelectAnnotators(userIds));
    datasetStats.mutate({
      projId: projectId,
      model: model!,
      requestBody: {
        sdoc_ids: sdocIds,
        user_ids: userIds,
        class_ids: classIds,
      },
    });
  };
  const handleSdocSelection = (sdocIds: number[]) => {
    dispatch(CRUDDialogActions.onClassifierDialogSelectSdocs(sdocIds));
    datasetStats.mutate({
      projId: projectId,
      model: model!,
      requestBody: {
        sdoc_ids: sdocIds,
        user_ids: userIds,
        class_ids: classIds,
      },
    });
  };

  // dialog actions
  const handlePrev = () => {
    dispatch(CRUDDialogActions.previousClassifierDialogStep());
  };
  const { mutate: startClassifierJobMutation, isPending } = ClassifierHooks.useStartClassifierJob();
  const handleNext = () => {
    if (model === undefined || task === undefined) return;

    let parameters;
    switch (task) {
      case ClassifierTask.TRAINING: {
        const trainingParams: ClassifierTrainingParams = {
          batch_size: 16,
          epochs: 10,
          classifier_name: "string",
          task_type: task,
          class_ids: classIds,
          sdoc_ids: sdocIds,
          user_ids: userIds,
        };
        parameters = trainingParams;
        break;
      }
      case ClassifierTask.EVALUATION: {
        if (classifierId === undefined) return;
        const evalParams: ClassifierEvaluationParams = {
          task_type: task,
          classifier_id: classifierId,
          sdoc_ids: sdocIds,
          user_ids: userIds,
        };
        parameters = evalParams;
        break;
      }
      case ClassifierTask.INFERENCE: {
        if (classifierId === undefined) return;
        const inferParams: ClassifierInferenceParams = {
          task_type: task,
          classifier_id: classifierId,
          sdoc_ids: sdocIds,
        };
        parameters = inferParams;
        break;
      }
    }

    startClassifierJobMutation(
      {
        requestBody: {
          model_type: model,
          task_type: task,
          project_id: projectId,
          task_parameters: parameters,
        },
      },
      {
        onSuccess: (data) => {
          dispatch(CRUDDialogActions.onClassifierDialogStartJob(data.job_id));
        },
      },
    );
  };

  const isNextDisabled =
    model === undefined ||
    (model === ClassifierModel.DOCUMENT
      ? sdocIds.length === 0 || classIds.length === 0
      : sdocIds.length === 0 || classIds.length === 0 || userIds.length === 0);
  return (
    <>
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          This is an info Alert.
        </Alert>
        <Stack direction="row" spacing={2} className="myFlexFillAllContainer">
          <Card sx={{ width: "100%" }} variant="outlined" className="h100 myFlexContainer">
            <CardHeader
              title="Select documents"
              slotProps={{
                title: {
                  variant: "h6",
                },
              }}
              sx={{ py: 1 }}
            />
            <Divider />
            <CardContent className="myFlexFillAllContainer" sx={{ p: "0px !important" }}>
              {metadata.isSuccess && (
                <DocumentSelection
                  projectId={projectId}
                  metadata={metadata.data}
                  initSelectedSdocIds={sdocIds}
                  onSdocIdsChange={handleSdocSelection}
                />
              )}
            </CardContent>
          </Card>
          <Stack width="100%" spacing={2}>
            {model !== ClassifierModel.DOCUMENT && (
              <Card variant="outlined" sx={{ flexShrink: 0 }}>
                <CardHeader
                  title="Select annotators"
                  slotProps={{
                    title: {
                      variant: "h6",
                    },
                  }}
                  sx={{ py: 1 }}
                />
                <Divider />
                <CardContent>
                  <UserSelectorMulti
                    userIds={userIds}
                    onUserIdChange={handleUserSelection}
                    title="Select Annotators"
                    fullWidth
                  />
                </CardContent>
              </Card>
            )}
            <Box className="myFlexFillAllContainer">
              <Card className="h100 myFlexContainer" sx={{ width: "100%" }} variant="outlined">
                <CardHeader
                  title="Dataset statistics"
                  slotProps={{
                    title: {
                      variant: "h6",
                    },
                  }}
                  sx={{ py: 1 }}
                />
                <Divider />
                <CardContent className="myFlexFillAllContainer">
                  {datasetStats.isPending ? (
                    <CircularProgress />
                  ) : datasetStats.isError ? (
                    <div>{datasetStats.error.message}</div>
                  ) : datasetStats.isSuccess && model ? (
                    <ClassifierDataPlot data={datasetStats.data} classifierModel={model} />
                  ) : (
                    <Box>Select data first!</Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </Stack>
      </Stack>
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handlePrev}>Back</Button>
        <Button disabled={isNextDisabled} loading={isPending} onClick={handleNext} loadingPosition="start">
          Next!
        </Button>
      </DialogActions>
    </>
  );
}

export default DataSelectionStep;

const filterName = "classifierDialogDocumentSelection";

interface DocumentSelectionProps {
  projectId: number;
  metadata: ProjectMetadataRead[];
  initSelectedSdocIds: number[];
  onSdocIdsChange: (sdocIds: number[]) => void;
}

function DocumentSelection({ projectId, metadata, initSelectedSdocIds, onSdocIdsChange }: DocumentSelectionProps) {
  // local state
  const [fetchSize, setFetchSize] = useState(20);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(
    initSelectedSdocIds.reduce((acc, id) => ({ ...acc, [`${id}`]: true }), {}),
  );
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.id]: false,
      };
    }, {}),
  );

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<ElasticSearchHit>) => (
      <Button
        onClick={() => onSdocIdsChange(props.selectedData.map((doc) => doc.id))}
        disabled={props.selectedData.length === 0}
      >
        Select {props.selectedData.length > 0 ? props.selectedData.length : null} Documents
      </Button>
    ),
    [onSdocIdsChange],
  );

  return (
    <SdocTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel}
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
      renderBottomToolbar={renderBottomToolbar}
    />
  );
}
