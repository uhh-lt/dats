import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { useParams } from "react-router";
import { v4 as uuidv4 } from "uuid";
import TableHooks from "../../../api/TableHooks.ts";
import { TableType } from "../../../api/openapi/models/TableType.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import AnalysisDashboard from "../AnalysisDashboard/AnalysisDashboard.tsx";
import {
  AnaylsisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "../AnalysisDashboard/useAnalysisDashboardTable.tsx";
import { TableType2Template } from "./templates.ts";

function TableDashboard() {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const {
    data: userTables,
    isLoading: isLoadingTables,
    isFetching: isFetchingTables,
    isError: isLoadingTablesError,
  } = TableHooks.useGetUserTables(projectId);

  // mutations
  const { mutate: createTable, isPending: isCreatingTable } = TableHooks.useCreateTable();
  const { mutate: deleteTable, isPending: isDeletingTable, variables: deletingVariables } = TableHooks.useDeleteTable();
  const {
    mutate: duplicateTable,
    isPending: isDuplicatingTable,
    variables: duplicatingVariables,
  } = TableHooks.useDuplicateTable();
  const { mutate: updateTable, isPending: isUpdatingTable } = TableHooks.useUpdateTable();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // CRUD actions
  const handleCreateAnalysis: HandleCreateAnalysis =
    (createOption) =>
    ({ values, table }) => {
      if (!createOption) return;

      const tableType = createOption.option as TableType;
      const content = [{ id: uuidv4(), name: `Table sheet 1`, content: TableType2Template[tableType] }];
      createTable(
        {
          requestBody: {
            project_id: projectId,
            title: values.title,
            content: JSON.stringify(content),
            table_type: tableType,
          },
        },
        {
          onSuccess(data) {
            openSnackbar({
              text: `Created new table '${data.title}'`,
              severity: "success",
            });
            table.setCreatingRow(null); //exit creating mode
          },
        },
      );
    };

  const handleDuplicateAnalysis = (row: MRT_Row<AnaylsisDashboardRow>) => {
    duplicateTable(
      {
        analysisTableId: row.original.id,
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Duplicated table '${data.title}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDeleteAnalysis = (row: MRT_Row<AnaylsisDashboardRow>) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the table ${row.original.id}? This action cannot be undone!`,
      onAccept: () => {
        deleteTable(
          {
            analysisTableId: row.original.id,
          },
          {
            onSuccess(data) {
              openSnackbar({
                text: `Deleted table '${data.title}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const handleEditAnalysis: MRT_TableOptions<AnaylsisDashboardRow>["onEditingRowSave"] = ({ values, table }) => {
    updateTable(
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
          openSnackbar({
            text: `Updated table '${data.title}'`,
            severity: "success",
          });
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "Table",
    data: userTables || [],
    isLoadingData: isLoadingTables,
    isFetchingData: isFetchingTables,
    isLoadingDataError: isLoadingTablesError,
    isCreatingAnalysis: isCreatingTable,
    isDeletingAnalysis: isDeletingTable,
    isDuplicatingAnalysis: isDuplicatingTable,
    isUpdatingAnalysis: isUpdatingTable,
    deletingAnalysisId: deletingVariables?.analysisTableId,
    duplicatingAnalysisId: duplicatingVariables?.analysisTableId,
    handleCreateAnalysis,
    handleEditAnalysis,
    handleDeleteAnalysis,
    handleDuplicateAnalysis,
    analysisCreateOptions: Object.values(TableType).map((key) => {
      return { option: key, label: key.toLocaleUpperCase() };
    }),
  });

  return (
    <AnalysisDashboard
      pageTitle="Table Dashboard"
      headerTitle="Table Dashboard"
      subheaderTitle="Manage your tables"
      table={table}
    />
  );
}

export default TableDashboard;
