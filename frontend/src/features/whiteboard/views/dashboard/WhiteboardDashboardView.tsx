import {
  AnalysisDashboard,
  AnalysisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "@components/analysis-dashboard";
import { useOpenConfirmationDialog } from "@core/notification";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { MRT_Row, MRT_TableOptions } from "material-react-table";
import {
  projectWhiteboardsQueryOptions,
  useCreateWhiteboard,
  useDeleteWhiteboard,
  useDuplicateWhiteboard,
  useUpdateWhiteboard,
} from "../../_api/whiteboardQueryOptions";
import { WhiteboardsExportButton } from "./_components/WhiteboardsExportButton";

const WhiteboardDashboardRouteAPI = getRouteApi("/_auth/project/$projectId/whiteboard/");

export function WhiteboardDashboardView() {
  // route params
  const projectId = WhiteboardDashboardRouteAPI.useParams({ select: (params) => params.projectId });

  // global server state
  const { data: projectWhiteboards } = useSuspenseQuery({
    ...projectWhiteboardsQueryOptions(projectId),
    select: (data) => Object.values(data),
  });

  // mutations
  const { mutate: createWhiteboard, isPending: isCreatingWhiteboard } = useCreateWhiteboard();
  const {
    mutate: deleteWhiteboard,
    isPending: isDeletingWhiteboard,
    variables: deletingVariables,
  } = useDeleteWhiteboard(projectId);
  const { mutate: updateWhiteboard, isPending: isUpdatingWhiteboard } = useUpdateWhiteboard();
  const {
    mutate: duplicateWhiteboard,
    isPending: isDuplicatingWhiteboard,
    variables: duplicatingVariables,
  } = useDuplicateWhiteboard(projectId);

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

  const navigate = WhiteboardDashboardRouteAPI.useNavigate();
  const handleOpenAnalysis = (row: AnalysisDashboardRow) => {
    console.log("Opening Whiteboard " + row.id);
    navigate({ to: "./$whiteboardId", params: { whiteboardId: row.id } });
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "Whiteboard",
    data: projectWhiteboards,
    isLoadingData: false,
    isFetchingData: false,
    isLoadingDataError: false,
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
