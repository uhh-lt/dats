import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import { Box, IconButton, Tooltip } from "@mui/material";
import { MRT_ColumnDef, MRT_TableOptions, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useCallback } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import AnalysisDashboard from "../../../features/AnalysisDashboard/AnalysisDashboard.tsx";
import CreateEntityCard from "../../../features/AnalysisDashboard/CreateTableCard.tsx";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";

const columns: MRT_ColumnDef<TimelineAnalysisRead>[] = [
  { accessorKey: "id", header: "ID" },
  {
    accessorKey: "name",
    header: "Name",
    // flex: 1,
    enableEditing: true,
  },
  {
    header: "Last modified",
    // flex: 0.5,
    id: "updated",
    accessorFn: (params) => dateToLocaleString(params.updated as string),
  },
];

function TimelineAnalysisDashboard() {
  const navigate = useNavigate();

  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const userAnalysis = TimelineAnalysisHooks.useGetUserTimelineAnalysiss(projectId, user?.id);

  // mutations
  const createAnalysis = TimelineAnalysisHooks.useCreateTimelineAnalysis();
  const deleteAnalysis = TimelineAnalysisHooks.useDeleteTimelineAnalysis();
  const updateAnalysis = TimelineAnalysisHooks.useUpdateTimelineAnalysis();

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
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Created new timeline analysis '${data.name}'`,
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
          onSuccess(data) {
            SnackbarAPI.openSnackbar({
              text: `Duplicated analysis '${data.name}'`,
              severity: "success",
            });
          },
        },
      );
    },
    [createAnalysis.mutate, projectId, user, userAnalysis.data],
  );

  const handleDeleteClick = (timelineAnalysisId: number) => () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the analysis ${timelineAnalysisId}? This action cannot be undone!`,
      onAccept: () => {
        deleteAnalysis.mutate(
          {
            timelineAnalysisId,
          },
          {
            onSuccess(data) {
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

  const handleSaveTimelineAnalysis: MRT_TableOptions<TimelineAnalysisRead>["onEditingRowSave"] = ({
    values,
    table,
  }) => {
    updateAnalysis.mutate(
      {
        timelineAnalysisId: values.id,
        requestBody: {
          name: values.name,
        },
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Updated analysis '${data.name}'`,
            severity: "success",
          });
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  // UI actions
  const handleRowClick = (timelineAnalysisId: number) => {
    // if (params.id in rowModesModel && rowModesModel[params.id].mode === GridRowModes.Edit) return;
    navigate(`./${timelineAnalysisId}`);
  };

  // const handleEditClick = (id: GridRowId) => () => {
  //   setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  // };

  // const handleSaveClick = (id: GridRowId) => () => {
  //   setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  // };

  // const handleCancelClick = (id: GridRowId) => () => {
  //   setRowModesModel({
  //     ...rowModesModel,
  //     [id]: { mode: GridRowModes.View, ignoreModifications: true },
  //   });
  // };

  // const handleRowEditStop: GridEventListener<"rowEditStop"> = (params, event) => {
  //   if (params.reason === GridRowEditStopReasons.rowFocusOut) {
  //     event.defaultMuiPrevented = true;
  //   }
  // };

  const createCards = (
    <>
      <CreateEntityCard
        title="New analysis"
        description="Create a new timeline analysis"
        onClick={() => handleCreateAnalysis("New analysis")}
      />
    </>
  );

  // table
  const table = useMaterialReactTable({
    data: userAnalysis.data || [],
    columns: columns,
    getRowId: (row) => row.id.toString(),
    // row actions
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => handleRowClick(row.original.id),
    }),
    // row editing
    enableEditing: true,
    editDisplayMode: "row", // ('modal', 'cell', 'table', and 'custom' are also available)
    onEditingRowSave: handleSaveTimelineAnalysis,
    // onEditingRowCancel: () => setValidationErrors({}),
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: "flex", gap: "1rem" }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Duplicate">
          <IconButton onClick={() => handleDuplicateAnalysis(row.original.id)}>
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton color="error" onClick={() => handleDeleteClick(row.original.id)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    // default values
    initialState: {
      sorting: [
        {
          id: "updated",
          desc: true,
        },
      ],
    },
    // autoPageSize
    // hideFooterSelectedRowCount
    // style={{ border: "none" }}
  });

  return (
    <AnalysisDashboard
      pageTitle="Timeline Analysis Dashboard"
      headerTitle="Create analysis"
      headerCards={createCards}
      bodyTitle="Load analysis"
    >
      <MaterialReactTable table={table} />
    </AnalysisDashboard>
  );
}

export default TimelineAnalysisDashboard;
