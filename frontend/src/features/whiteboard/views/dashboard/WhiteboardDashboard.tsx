import { WhiteboardHooks } from "@api/hooks/WhiteboardHooks";
import {
  AnalysisDashboard,
  AnalysisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "@components/analysis-dashboard";
import { useOpenConfirmationDialog } from "@core/notification";
import { getRouteApi } from "@tanstack/react-router";
import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { WhiteboardsExportButton } from "./_components/WhiteboardsExportButton";

const routeApi = getRouteApi("/_auth/project/$projectId/whiteboard/");

export function WhiteboardDashboardView() {
  // global client state
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

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

  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDeleteClick = (row: MRT_Row<AnalysisDashboardRow>) => {
    openConfirmationDialog({
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

  const navigate = routeApi.useNavigate();
  const handleOpenAnalysis = (row: AnalysisDashboardRow) => {
    console.log("Opening Whiteboard " + row.id);
    navigate({ to: "./$whiteboardId", params: { whiteboardId: row.id } });
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
    onOpenAnalysis: handleOpenAnalysis,
    handleCreateAnalysis: handleCreateWhiteboard,
    handleEditAnalysis: handleUpdateWhiteboard,
    handleDeleteAnalysis: handleDeleteClick,
    handleDuplicateAnalysis: handleDuplicateClick,
    renderExportButton: (props) => <WhiteboardsExportButton {...props} />,
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
