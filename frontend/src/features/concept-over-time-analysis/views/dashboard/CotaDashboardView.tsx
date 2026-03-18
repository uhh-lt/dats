import {
  AnalysisDashboard,
  AnalysisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "@components/analysis-dashboard";
import { useOpenConfirmationDialog } from "@core/notification";
import { useAppDispatch } from "@store/storeHooks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { useMemo } from "react";
import {
  projectCotasQueryOptions,
  useCreateCota,
  useDeleteCota,
  useDuplicateCota,
  useUpdateCota,
} from "../../_api/cotaQueryOptions";
import { CotaActions } from "../../store/cotaSlice";
import { CotaExportButton } from "./_components/CotaExportButton";

const COTADashboardRouteAPI = getRouteApi("/_auth/project/$projectId/analysis/concepts-over-time-analysis/");

export function CotaDashboardView() {
  // global client state
  const projectId = COTADashboardRouteAPI.useParams({ select: (params) => params.projectId });

  // global server state
  const { data: userAnalysis } = useSuspenseQuery({
    ...projectCotasQueryOptions(projectId),
    select: (data) => Object.values(data),
  });
  const projectAnalysisTableData: AnalysisDashboardRow[] = useMemo(
    () =>
      userAnalysis?.map((analysis) => ({
        id: analysis.id,
        title: analysis.name,
        updated: analysis.updated,
      })) || [],
    [userAnalysis],
  );

  // mutations
  const { mutate: createCota, isPending: isCreatingCota } = useCreateCota();
  const { mutate: deleteCota, isPending: isDeletingCota, variables: deletingVariables } = useDeleteCota();
  const { mutate: updateCota, isPending: isUpdatingCota } = useUpdateCota();
  const { mutate: duplicateCota, isPending: isDuplicatingCota, variables: duplicatingVariables } = useDuplicateCota();

  const dispatch = useAppDispatch();

  // CRUD actions
  const handleCreateAnalysis: HandleCreateAnalysis =
    () =>
    ({ values, table }) => {
      createCota(
        {
          requestBody: {
            project_id: projectId,
            name: values.title,
          },
        },
        {
          onSuccess() {
            table.setCreatingRow(null); //exit creating mode
          },
        },
      );
    };

  const handleDuplicateAnalysis = (row: MRT_Row<AnalysisDashboardRow>) => {
    duplicateCota({
      cotaId: row.original.id,
    });
  };

  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDeleteAnalysis = (row: MRT_Row<AnalysisDashboardRow>) => {
    openConfirmationDialog({
      text: `Do you really want to remove the analysis ${row.original.id}? This action cannot be undone!`,
      onAccept: () => {
        deleteCota({
          cotaId: row.original.id,
        });
      },
    });
  };

  const handleEditAnalysis: MRT_TableOptions<AnalysisDashboardRow>["onEditingRowSave"] = ({ values, table, row }) => {
    updateCota(
      {
        cotaId: row.original.id,
        requestBody: {
          name: values.title,
        },
      },
      {
        onSuccess() {
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  const navigate = COTADashboardRouteAPI.useNavigate();
  const handleOpenAnalysis = (row: AnalysisDashboardRow) => {
    dispatch(CotaActions.onOpenCota({ analysisId: row.id }));
    navigate({ to: "./$cotaId", params: { cotaId: row.id } });
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "COTA",
    data: projectAnalysisTableData,
    isLoadingData: false,
    isFetchingData: false,
    isLoadingDataError: false,
    isCreatingAnalysis: isCreatingCota,
    isUpdatingAnalysis: isUpdatingCota,
    isDuplicatingAnalysis: isDuplicatingCota,
    isDeletingAnalysis: isDeletingCota,
    deletingAnalysisId: deletingVariables?.cotaId,
    duplicatingAnalysisId: duplicatingVariables?.cotaId,
    onOpenAnalysis: handleOpenAnalysis,
    handleCreateAnalysis,
    handleEditAnalysis,
    handleDeleteAnalysis,
    handleDuplicateAnalysis,
    renderExportButton: (props) => <CotaExportButton {...props} />,
  });

  return (
    <AnalysisDashboard
      pageTitle="Concept Over Time Analysis Dashboard"
      headerTitle="Concept Over Time Dashboard"
      subheaderTitle="Manage your Concept Over Time Analysis"
      table={table}
    />
  );
}
