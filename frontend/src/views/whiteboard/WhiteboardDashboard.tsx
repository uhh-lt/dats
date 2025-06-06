import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { useParams } from "react-router";
import WhiteboardHooks from "../../api/WhiteboardHooks.ts";
import ConfirmationAPI from "../../components/ConfirmationDialog/ConfirmationAPI.ts";
import ExportWhiteboardsButton from "../../components/Export/ExportWhiteboardsButton.tsx";
import AnalysisDashboard from "../analysis/AnalysisDashboard/AnalysisDashboard.tsx";
import {
  AnalysisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "../analysis/AnalysisDashboard/useAnalysisDashboardTable.tsx";

function WhiteboardDashboard() {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const {
    data: projectWhiteboards,
    isLoading: isLoadingWhiteboards,
    isFetching: isFetchingWhiteboards,
    isError: isLoadingWhiteboardsError,
  } = WhiteboardHooks.useGetProjectWhiteboardsList();

  // mutations
  const { mutate: createWhiteboard, isPending: isCreatingWhiteboard } = WhiteboardHooks.useCreateWhiteboard();
  const {
    mutate: deleteWhiteboard,
    isPending: isDeletingWhiteboard,
    variables: deletingVariables,
  } = WhiteboardHooks.useDeleteWhiteboard();
  const { mutate: updateWhiteboard, isPending: isUpdatingWhiteboard } = WhiteboardHooks.useUpdateWhiteboard();
  const {
    mutate: duplicateWhiteboard,
    isPending: isDuplicatingWhiteboard,
    variables: duplicatingVariables,
  } = WhiteboardHooks.useDuplicateWhiteboard();

  // CRUD actions
  const handleDuplicateClick = (row: MRT_Row<AnalysisDashboardRow>) => {
    duplicateWhiteboard({
      whiteboardId: row.original.id,
    });
  };

  const handleDeleteClick = (row: MRT_Row<AnalysisDashboardRow>) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the whiteboard ${row.original.id}? This action cannot be undone!`,
      onAccept: () => {
        deleteWhiteboard({
          whiteboardId: row.original.id,
        });
      },
    });
  };

  const handleCreateWhiteboard: HandleCreateAnalysis =
    () =>
    ({ values, table }) => {
      createWhiteboard(
        {
          requestBody: {
            project_id: projectId,
            title: values.title,
          },
        },
        {
          onSuccess() {
            table.setCreatingRow(null); //exit creating mode
          },
        },
      );
    };
  const handleUpdateWhiteboard: MRT_TableOptions<AnalysisDashboardRow>["onEditingRowSave"] = ({
    row,
    values,
    table,
  }) => {
    if (!values.title || values.title === row.original.title) {
      table.setEditingRow(null); //exit editing mode
      return; // not provided OR no change
    }
    updateWhiteboard(
      {
        whiteboardId: row.original.id,
        requestBody: {
          title: values.title,
        },
      },
      {
        onSuccess() {
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "Whiteboard",
    data: projectWhiteboards || [],
    isLoadingData: isLoadingWhiteboards,
    isFetchingData: isFetchingWhiteboards,
    isLoadingDataError: isLoadingWhiteboardsError,
    isCreatingAnalysis: isCreatingWhiteboard,
    isDeletingAnalysis: isDeletingWhiteboard,
    isDuplicatingAnalysis: isDuplicatingWhiteboard,
    isUpdatingAnalysis: isUpdatingWhiteboard,
    deletingAnalysisId: deletingVariables?.whiteboardId,
    duplicatingAnalysisId: duplicatingVariables?.whiteboardId,
    onOpenAnalysis: (analysisId) => console.log("Opening Whiteboard " + analysisId),
    handleCreateAnalysis: handleCreateWhiteboard,
    handleEditAnalysis: handleUpdateWhiteboard,
    handleDeleteAnalysis: handleDeleteClick,
    handleDuplicateAnalysis: handleDuplicateClick,
    renderExportButton: (props) => <ExportWhiteboardsButton {...props} />,
  });

  return (
    <AnalysisDashboard
      pageTitle="Whiteboard Dashboard"
      headerTitle="Whiteboard Dashboard"
      subheaderTitle="Manage your whiteboards"
      table={table}
    />
  );
}

export default WhiteboardDashboard;
