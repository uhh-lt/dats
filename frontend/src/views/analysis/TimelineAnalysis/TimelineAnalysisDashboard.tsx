import CancelIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
} from "@mui/x-data-grid";
import { useCallback, useState } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks";
import { TimelineAnalysisRead } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import AnalysisDashboard from "../../../features/AnalysisDashboard/AnalysisDashboard";
import CreateEntityCard from "../../../features/AnalysisDashboard/CreateTableCard";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { dateToLocaleString } from "../../../utils/DateUtils";

function TimelineAnalysisDashboard() {
  const navigate = useNavigate();

  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const userAnalysis = TimelineAnalysisHooks.useGetUserTimelineAnalysiss(projectId, user?.id);

  // local client state
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  // mutations
  const createAnalysis = TimelineAnalysisHooks.useCreateTimelineAnalysis();
  const deleteAnalysis = TimelineAnalysisHooks.useDeleteTimelineAnalysis();
  const updateAnalysis = TimelineAnalysisHooks.useUpdateTimelineAnalysis();

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID" },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      editable: true,
    },
    {
      field: "updated",
      headerName: "Last modified",
      flex: 0.5,
      valueGetter: (params) => dateToLocaleString(params.value as string),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              sx={{
                color: "primary.main",
              }}
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
          <GridActionsCellItem
            icon={<ContentCopyIcon />}
            label="Duplicate"
            onClick={handleDuplicateAnalysis(id as number)}
            color="inherit"
          />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} color="inherit" />,
        ];
      },
    },
  ];

  // CRUD actions
  const handleCreateAnalysis = (title: string) => {
    if (!user?.id) return;

    createAnalysis.mutate(
      {
        requestBody: {
          project_id: projectId,
          user_id: user.id,
          name: title,
        },
      },
      {
        onSuccess(_data, _variables, _context) {
          SnackbarAPI.openSnackbar({
            text: `Created new analysis '${title}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDuplicateAnalysis = useCallback(
    (id: number) => () => {
      if (!user?.id || !userAnalysis.data) return;

      const analysis = userAnalysis.data.find((analysis) => analysis.id === id);
      if (!analysis) return;

      const mutation = createAnalysis.mutate;
      mutation(
        {
          requestBody: {
            project_id: projectId,
            user_id: user.id,
            name: analysis.name + " (copy)",
          },
        },
        {
          onSuccess(_data, _variables, _context) {
            SnackbarAPI.openSnackbar({
              text: `Duplicated analysis '${analysis.name}'`,
              severity: "success",
            });
          },
        },
      );
    },
    [createAnalysis.mutate, projectId, user, userAnalysis.data],
  );

  const handleDeleteClick = (id: GridRowId) => () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the analysis ${id}? This action cannot be undone!`,
      onAccept: () => {
        deleteAnalysis.mutate(
          {
            timelineAnalysisId: id as number,
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: `Deleted analysis '${data.name}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const processRowUpdate = (newRow: GridRowModel<TimelineAnalysisRead>) => {
    updateAnalysis.mutate(
      {
        timelineAnalysisId: newRow.id,
        requestBody: {
          name: newRow.name,
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated analysis '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
    return newRow;
  };

  // UI actions
  const handleRowClick: GridEventListener<"rowClick"> = (params, event) => {
    if (params.id in rowModesModel && rowModesModel[params.id].mode === GridRowModes.Edit) return;
    navigate(`./${params.id}`);
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const handleRowEditStop: GridEventListener<"rowEditStop"> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const createCards = (
    <>
      <CreateEntityCard
        title="New analysis"
        description="Create a new timeline analysis"
        onClick={() => handleCreateAnalysis("New analysis")}
      />
    </>
  );

  return (
    <AnalysisDashboard
      pageTitle="Timeline Analysis Dashboard"
      headerTitle="Create analysis"
      headerCards={createCards}
      bodyTitle="Load analysis"
    >
      <DataGrid
        rows={userAnalysis.data || []}
        columns={columns}
        autoPageSize
        getRowId={(row) => row.id}
        onRowClick={handleRowClick}
        hideFooterSelectedRowCount
        style={{ border: "none" }}
        initialState={{
          sorting: {
            sortModel: [{ field: "updated", sort: "desc" }],
          },
        }}
        editMode="row"
        rowModesModel={rowModesModel}
        onRowModesModelChange={(newRowModesModel) => setRowModesModel(newRowModesModel)}
        onRowEditStop={handleRowEditStop}
        processRowUpdate={processRowUpdate}
      />
    </AnalysisDashboard>
  );
}

export default TimelineAnalysisDashboard;
