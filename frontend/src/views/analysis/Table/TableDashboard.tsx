import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import { Box, IconButton, Tooltip } from "@mui/material";
import { MRT_ColumnDef, MRT_TableOptions, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useCallback } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import TableHooks, { TableRead } from "../../../api/TableHooks.ts";
import { TableType } from "../../../api/openapi/models/TableType.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import AnalysisDashboard from "../../../features/AnalysisDashboard/AnalysisDashboard.tsx";
import CreateEntityCard from "../../../features/AnalysisDashboard/CreateTableCard.tsx";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import { TableType2Template } from "./templates.ts";

function TableDashboard() {
  const navigate = useNavigate();

  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const userTables = TableHooks.useGetUserTables(projectId, user?.id);

  // mutations
  const createTable = TableHooks.useCreateTable();
  const deleteTable = TableHooks.useDeleteTable();
  const updateTable = TableHooks.useUpdateTable();

  const columns: MRT_ColumnDef<TableRead>[] = [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "title",
      header: "Name",
      // flex: 1,
      enableEditing: true,
    },
    {
      header: "Last modified",
      // flex: 0.5,
      id: "updated",
      accessorFn: (params) => dateToLocaleString(params.updated),
    },
  ];

  // CRUD actions
  const handleCreateTable = (tableType: TableType, title: string) => {
    if (!user?.id) return;

    const content = [{ id: uuidv4(), name: `Table sheet 1`, content: TableType2Template[tableType] }];
    createTable.mutate(
      {
        requestBody: {
          project_id: projectId,
          user_id: user.id,
          title,
          content: JSON.stringify(content),
          table_type: tableType,
        },
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Created new table '${data.title}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDuplicateTable = useCallback(
    (id: number) => () => {
      if (!user?.id || !userTables.data) return;

      const table = userTables.data.find((table) => table.id === id);
      if (!table) return;

      const mutation = createTable.mutate;
      mutation(
        {
          requestBody: {
            project_id: projectId,
            user_id: user.id,
            title: table.title + " (copy)",
            content: JSON.stringify(table.content),
            table_type: table.table_type,
          },
        },
        {
          onSuccess(data) {
            SnackbarAPI.openSnackbar({
              text: `Duplicated table '${data.title}'`,
              severity: "success",
            });
          },
        },
      );
    },
    [createTable.mutate, projectId, user, userTables.data],
  );

  const handleDeleteClick = (tableId: number) => () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the table ${tableId}? This action cannot be undone!`,
      onAccept: () => {
        deleteTable.mutate(
          {
            analysisTableId: tableId as number,
          },
          {
            onSuccess(data) {
              SnackbarAPI.openSnackbar({
                text: `Deleted table '${data.title}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const handleSaveTable: MRT_TableOptions<TableRead>["onEditingRowSave"] = ({ values, table }) => {
    updateTable.mutate(
      {
        analysisTableId: values.id,
        requestBody: {
          title: values.title,
          content: JSON.stringify(values.content),
          table_type: values.table_type,
        },
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Updated table '${data.title}'`,
            severity: "success",
          });
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  // UI actions
  const handleRowClick = (tableId: number) => {
    // if (params.id in rowModesModel && rowModesModel[params.id].mode === GridRowModes.Edit) return;
    navigate(`./${tableId}`);
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
        title="Empty table"
        description="Create an empty table with no template"
        onClick={() => handleCreateTable(TableType.CUSTOM, "New table")}
      />
      <CreateEntityCard
        title="Interpretation table"
        description="Create a table with the interpretation template"
        onClick={() => handleCreateTable(TableType.INTERPRETATION, "New interpretation table")}
      />
      <CreateEntityCard
        title="Phenomenon table"
        description="Create a table with the phenomenon template"
        onClick={() => handleCreateTable(TableType.PHENOMENON, "New phenomenon table")}
      />
      <CreateEntityCard
        title="Situation table"
        description="Create a table with the situation template"
        onClick={() => handleCreateTable(TableType.SITUATION, "New situation table")}
      />
    </>
  );

  // table
  const table = useMaterialReactTable({
    data: userTables.data || [],
    columns: columns,
    getRowId: (row) => row.id.toString(),
    // row actions
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => handleRowClick(row.original.id),
    }),
    // row editing
    enableEditing: true,
    editDisplayMode: "row", // ('modal', 'cell', 'table', and 'custom' are also available)
    onEditingRowSave: handleSaveTable,
    // onEditingRowCancel: () => setValidationErrors({}),
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: "flex", gap: "1rem" }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Duplicate">
          <IconButton onClick={() => handleDuplicateTable(row.original.id)}>
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
      pageTitle="Table Dashboard"
      headerTitle="Create table"
      headerCards={createCards}
      bodyTitle="Load table"
    >
      <MaterialReactTable table={table} />
    </AnalysisDashboard>
  );
}

export default TableDashboard;
