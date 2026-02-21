import { getRouteApi } from "@tanstack/react-router";
import { MRT_ColumnDef, MRT_Row, MRT_TableOptions } from "material-react-table";
import { useMemo } from "react";
import { TimelineAnalysisType } from "../../../api/openapi/models/TimelineAnalysisType.ts";
import { TimelineAnalysisHooks } from "../../../api/TimelineAnalysisHooks.ts";
import { ConfirmationAPI } from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { ExportTimelineAnalysisButton } from "../../../components/Export/ExportTimelineAnalysisButton.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AnalysisDashboard } from "../AnalysisDashboard/AnalysisDashboard.tsx";
import {
  AnalysisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "../AnalysisDashboard/useAnalysisDashboardTable.tsx";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/timeline/");

interface TimelineAnaylsisDashboardRow extends AnalysisDashboardRow {
  type: TimelineAnalysisType;
}

const additionalColumns: MRT_ColumnDef<TimelineAnaylsisDashboardRow>[] = [
  {
    id: "type",
    header: "Type",
    accessorFn: (params) => params.type,
    enableEditing: false,
  },
];

export function TimelineAnalysisDashboard() {
  // global client state
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // global server state
  const {
    data: userAnalysis,
    isLoading: isLoadingAnalysis,
    isFetching: isFetchingAnalysis,
    isError: isLoadingAnalysisError,
  } = TimelineAnalysisHooks.useGetProjectTimelineAnalysisList();
  const userAnalysisTableData: TimelineAnaylsisDashboardRow[] = useMemo(
    () =>
      userAnalysis?.map((analysis) => ({
        id: analysis.id,
        title: analysis.name,
        updated: analysis.updated,
        type: analysis.timeline_analysis_type,
      })) || [],
    [userAnalysis],
  );

  // mutations
  const { mutate: createTimelineAnalysis, isPending: isCreatingTimelineAnalysis } =
    TimelineAnalysisHooks.useCreateTimelineAnalysis();
  const {
    mutate: deleteTimelineAnalysis,
    isPending: isDeletingTimelineAnalysis,
    variables: deletingVariables,
  } = TimelineAnalysisHooks.useDeleteTimelineAnalysis();
  const { mutate: updateTimelineAnalysis, isPending: isUpdatingTimelineAnalysis } =
    TimelineAnalysisHooks.useUpdateTimelineAnalysis();
  const {
    mutate: duplicateTimelineAnalysis,
    isPending: isDuplicatingTimelineAnalysis,
    variables: duplicatingVariables,
  } = TimelineAnalysisHooks.useDuplicateTimelineAnalysis();

  const dispatch = useAppDispatch();

  // CRUD actions
  const handleCreateAnalysis: HandleCreateAnalysis<TimelineAnaylsisDashboardRow> =
    (createOption) =>
    ({ values, table }) => {
      createTimelineAnalysis(
        {
          requestBody: {
            project_id: projectId,
            name: values.title,
            timeline_analysis_type: (createOption?.option as TimelineAnalysisType) || TimelineAnalysisType.DOCUMENT,
          },
        },
        {
          onSuccess() {
            table.setCreatingRow(null); //exit creating mode
          },
        },
      );
    };

  const handleDuplicateAnalysis = (row: MRT_Row<TimelineAnaylsisDashboardRow>) => {
    duplicateTimelineAnalysis({
      timelineAnalysisId: row.original.id,
    });
  };

  const handleDeleteAnalysis = (row: MRT_Row<TimelineAnaylsisDashboardRow>) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the analysis ${row.original.id}? This action cannot be undone!`,
      onAccept: () => {
        deleteTimelineAnalysis({
          timelineAnalysisId: row.original.id,
        });
      },
    });
  };

  const handleEditAnalysis: MRT_TableOptions<TimelineAnaylsisDashboardRow>["onEditingRowSave"] = ({
    values,
    table,
    row,
  }) => {
    updateTimelineAnalysis(
      {
        timelineAnalysisId: row.original.id,
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
  const handleOpenAnalysis = (row: TimelineAnaylsisDashboardRow) => {
    dispatch(
      TimelineAnalysisActions.onOpenTimelineAnalysis({
        analysisId: row.id,
        analysisType: row.type,
        projectId,
      }),
    );
    navigate({ to: "./$analysisId", params: { analysisId: row.id } });
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "Timeline Analysis",
    data: userAnalysisTableData,
    isLoadingData: isLoadingAnalysis,
    isFetchingData: isFetchingAnalysis,
    isLoadingDataError: isLoadingAnalysisError,
    isCreatingAnalysis: isCreatingTimelineAnalysis,
    isUpdatingAnalysis: isUpdatingTimelineAnalysis,
    isDuplicatingAnalysis: isDuplicatingTimelineAnalysis,
    isDeletingAnalysis: isDeletingTimelineAnalysis,
    deletingAnalysisId: deletingVariables?.timelineAnalysisId,
    duplicatingAnalysisId: duplicatingVariables?.timelineAnalysisId,
    onOpenAnalysis: handleOpenAnalysis,
    handleCreateAnalysis,
    handleEditAnalysis,
    handleDeleteAnalysis,
    handleDuplicateAnalysis,
    analysisCreateOptions: [
      {
        option: TimelineAnalysisType.DOCUMENT,
        label: "Documents",
      },
      {
        option: TimelineAnalysisType.SENTENCE_ANNOTATION,
        label: "Sentence Annotations",
      },
      {
        option: TimelineAnalysisType.SPAN_ANNOTATION,
        label: "Span Annotations",
      },
      {
        option: TimelineAnalysisType.BBOX_ANNOTATION,
        label: "Image Annotations",
      },
    ],
    additionalColumns,
    renderExportButton: (props) => <ExportTimelineAnalysisButton {...props} />,
  });

  return (
    <AnalysisDashboard
      pageTitle="Timeline Analysis Dashboard"
      headerTitle="Timeline Analysis Dashboard"
      subheaderTitle="Manage your timeline analysis"
      table={table}
    />
  );
}
