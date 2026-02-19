import { getRouteApi } from "@tanstack/react-router";
import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { useMemo } from "react";
import CotaHooks from "../../../api/CotaHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import ExportCotaButton from "../../../components/Export/ExportCotaButton.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import AnalysisDashboard from "../AnalysisDashboard/AnalysisDashboard.tsx";
import {
  AnalysisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "../AnalysisDashboard/useAnalysisDashboardTable.tsx";
import { CotaActions } from "./cotaSlice.ts";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/concepts-over-time-analysis/");

function CotaDashboard() {
  // global client state
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // global server state
  const {
    data: userAnalysis,
    isLoading: isLoadingAnalysis,
    isFetching: isFetchingAnalysis,
    isError: isLoadingAnalysisError,
  } = CotaHooks.useGetProjectCotaList();
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
  const { mutate: createCota, isPending: isCreatingCota } = CotaHooks.useCreateCota();
  const { mutate: deleteCota, isPending: isDeletingCota, variables: deletingVariables } = CotaHooks.useDeleteCota();
  const { mutate: updateCota, isPending: isUpdatingCota } = CotaHooks.useUpdateCota();
  const {
    mutate: duplicateCota,
    isPending: isDuplicatingCota,
    variables: duplicatingVariables,
  } = CotaHooks.useDuplicateCota();

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

  const handleDeleteAnalysis = (row: MRT_Row<AnalysisDashboardRow>) => {
    ConfirmationAPI.openConfirmationDialog({
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

  const navigate = routeApi.useNavigate();
  const handleOpenAnalysis = (row: AnalysisDashboardRow) => {
    dispatch(CotaActions.onOpenCota({ analysisId: row.id }));
    navigate({ to: "./$cotaId", params: { cotaId: row.id } });
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "COTA",
    data: projectAnalysisTableData,
    isLoadingData: isLoadingAnalysis,
    isFetchingData: isFetchingAnalysis,
    isLoadingDataError: isLoadingAnalysisError,
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
    renderExportButton: (props) => <ExportCotaButton {...props} />,
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

export default CotaDashboard;
