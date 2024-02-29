import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import { Box, IconButton, Tooltip } from "@mui/material";
import { MRT_ColumnDef, MRT_TableOptions, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useCallback } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import WhiteboardHooks, { Whiteboard, WhiteboardGraph } from "../../api/WhiteboardHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import AnalysisDashboard from "../../features/AnalysisDashboard/AnalysisDashboard.tsx";
import CreateEntityCard from "../../features/AnalysisDashboard/CreateTableCard.tsx";
import ConfirmationAPI from "../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";

const columns: MRT_ColumnDef<Whiteboard>[] = [
  { accessorKey: "id", header: "ID", enableEditing: false },
  {
    accessorKey: "title",
    header: "Name",
    // flex: 1,
    enableEditing: true,
  },
  {
    id: "updated",
    header: "Last modified",
    // flex: 0.5,
    accessorFn: (params) => dateToLocaleString(params.updated as string),
    enableEditing: false,
  },
];

function WhiteboardDashboard() {
  const navigate = useNavigate();

  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const projectWhiteboards = WhiteboardHooks.useGetProjectWhiteboards(projectId);

  // mutations
  const createWhiteboard = WhiteboardHooks.useCreateWhiteboard();
  const deleteWhiteboard = WhiteboardHooks.useDeleteWhiteboard();
  const updateWhiteboard = WhiteboardHooks.useUpdateWhiteboard();

  // CRUD actions
  const handleCreateWhiteboard = (title: string) => {
    if (!user?.id) return;

    const content: WhiteboardGraph = { nodes: [], edges: [] };
    createWhiteboard.mutate(
      {
        requestBody: {
          project_id: projectId,
          user_id: user.id,
          title,
          content: JSON.stringify(content),
        },
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Created new whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDuplicateWhiteboard = useCallback(
    (id: number) => () => {
      if (!user?.id || !projectWhiteboards.data) return;

      const whiteboard = projectWhiteboards.data.find((whiteboard) => whiteboard.id === id);
      if (!whiteboard) return;

      const mutation = createWhiteboard.mutate;
      mutation(
        {
          requestBody: {
            project_id: projectId,
            user_id: user.id,
            title: whiteboard.title + " (copy)",
            content: JSON.stringify(whiteboard.content),
          },
        },
        {
          onSuccess(data) {
            SnackbarAPI.openSnackbar({
              text: `Duplicated whiteboard '${data.title}'`,
              severity: "success",
            });
          },
        },
      );
    },
    [createWhiteboard.mutate, projectId, user, projectWhiteboards.data],
  );

  const handleDeleteClick = (whiteboardId: number) => () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the whiteboard ${whiteboardId}? This action cannot be undone!`,
      onAccept: () => {
        deleteWhiteboard.mutate(
          {
            whiteboardId,
          },
          {
            onSuccess(data) {
              SnackbarAPI.openSnackbar({
                text: `Deleted whiteboard '${data.title}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const handleSaveWhiteboard: MRT_TableOptions<Whiteboard>["onEditingRowSave"] = ({ values, table }) => {
    updateWhiteboard.mutate(
      {
        whiteboardId: values.id,
        requestBody: {
          title: values.title,
          content: JSON.stringify(values.content),
        },
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Updated whiteboard '${data.title}'`,
            severity: "success",
          });
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  // UI actions
  const handleRowClick = (whiteboardId: number) => {
    // if (params.id in rowModesModel && rowModesModel[params.id].mode === GridRowModes.Edit) return;
    navigate(`./${whiteboardId}`);
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
        title="Empty whiteboard"
        description="Create an empty whiteboard with no template"
        onClick={() => handleCreateWhiteboard("New Whiteboard")}
      />
      <CreateEntityCard
        title="Code whiteboard"
        description="Create a whiteboard with all of your codes"
        onClick={() => handleCreateWhiteboard("New Code Whiteboard")}
      />
      <CreateEntityCard
        title="Image whiteboard"
        description="Create a whiteboard with images"
        onClick={() => handleCreateWhiteboard("New Image Whiteboard")}
      />
    </>
  );

  // table
  const table = useMaterialReactTable({
    data: projectWhiteboards.data || [],
    columns: columns,
    getRowId: (row) => row.id.toString(),
    // row actions
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => handleRowClick(row.original.id),
    }),
    // row editing
    enableEditing: true,
    editDisplayMode: "row", // ('modal', 'cell', 'table', and 'custom' are also available)
    onEditingRowSave: handleSaveWhiteboard,
    // onEditingRowCancel: () => setValidationErrors({}),
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: "flex", gap: "1rem" }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Duplicate">
          <IconButton onClick={() => handleDuplicateWhiteboard(row.original.id)}>
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
      pageTitle="Whiteboard Dashboard"
      headerTitle="Create whiteboard"
      headerCards={createCards}
      bodyTitle="Load whiteboard"
    >
      <MaterialReactTable table={table} />
    </AnalysisDashboard>
  );
}

export default WhiteboardDashboard;
