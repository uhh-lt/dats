import { useNavigationTitle } from "@core/navigation";
import { AnalysisDashboard, AnalysisDashboardRow, useAnalysisDashboardTable } from "@components/analysis-dashboard";
import { useOpenConfirmationDialog } from "@core/notification";
import { TASK_TYPE_LABELS } from "@core/prompt";
import { AgreementScoring } from "@models/AgreementScoring";
import { ExperimentRead } from "@models/ExperimentRead";
import { TaskType } from "@models/TaskType";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { MRT_ColumnDef, MRT_Row, MRT_TableOptions } from "material-react-table";
import { useMemo } from "react";
import { ExperimentHooks } from "../../api/experimentHooks";
import { bestF1, formatScore } from "../../_utils/experimentUtils";
import { ExperimentCreateDialog } from "./_components/ExperimentCreateDialog";

const routeApi = getRouteApi("/_auth/project/$projectId/experiments/");

type ExperimentDashboardRow = AnalysisDashboardRow & {
  taskType: TaskType;
  runCount: number;
  bestF1: number | undefined;
};

const additionalColumns: MRT_ColumnDef<ExperimentDashboardRow>[] = [
  {
    id: "taskType",
    header: "Task",
    accessorFn: (row) => TASK_TYPE_LABELS[row.taskType],
    enableEditing: false,
  },
  {
    id: "bestF1",
    header: "Best F1",
    accessorFn: (row) => row.bestF1,
    Cell: ({ row }) => formatScore(row.original.bestF1),
    sortUndefined: "last",
    enableEditing: false,
  },
];

// the last modification is a column users can show, but it is hidden at first
const initialColumnVisibility = { updated: false };

/** The experiments of the project: all project members see and work on them. */
export function ExperimentDashboardView() {
  const title = useNavigationTitle() ?? "";
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const { experimentsByProjectOptions } = routeApi.useRouteContext();
  const { data: experiments } = useSuspenseQuery({
    ...experimentsByProjectOptions,
    select: (data) => Object.values(data),
  });
  const rows: ExperimentDashboardRow[] = useMemo(
    () =>
      experiments.map((experiment: ExperimentRead) => ({
        id: experiment.id,
        title: experiment.name,
        updated: experiment.updated,
        taskType: experiment.task_type,
        runCount: experiment.runs.length,
        bestF1: bestF1(experiment, AgreementScoring.CONSTITUENTS),
      })),
    [experiments],
  );

  // mutations
  const { mutate: updateExperimentMutation, isPending: isUpdating } = ExperimentHooks.useUpdateExperiment();
  const {
    mutate: deleteExperimentMutation,
    isPending: isDeleting,
    variables: deletingVariables,
  } = ExperimentHooks.useDeleteExperiment();

  // actions
  const handleEditExperiment: MRT_TableOptions<ExperimentDashboardRow>["onEditingRowSave"] = ({
    values,
    table,
    row,
  }) => {
    if (!values.title || values.title === row.original.title) {
      table.setEditingRow(null); //exit editing mode
      return; // not provided OR no change
    }
    // renaming an experiment renames the virtual users of its runs
    updateExperimentMutation(
      { experimentId: row.original.id, requestBody: { name: values.title } },
      { onSuccess: () => table.setEditingRow(null) },
    );
  };

  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDeleteExperiment = (row: MRT_Row<ExperimentDashboardRow>) => {
    openConfirmationDialog({
      text:
        `Do you really want to delete the experiment ${row.original.title}? Its ${row.original.runCount} run(s) and ` +
        "their virtual users are deleted with all their annotations. This action cannot be undone!",
      onAccept: () => deleteExperimentMutation({ experimentId: row.original.id }),
    });
  };

  const navigate = routeApi.useNavigate();
  const handleOpenExperiment = (row: ExperimentDashboardRow) => {
    navigate({ to: "./$experimentId", params: { experimentId: row.id } });
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "Experiment",
    data: rows,
    isLoadingData: false,
    isFetchingData: false,
    isLoadingDataError: false,
    isCreatingAnalysis: false,
    isUpdatingAnalysis: isUpdating,
    isDuplicatingAnalysis: false,
    isDeletingAnalysis: isDeleting,
    deletingAnalysisId: deletingVariables?.experimentId,
    onOpenAnalysis: handleOpenExperiment,
    handleEditAnalysis: handleEditExperiment,
    handleDeleteAnalysis: handleDeleteExperiment,
    additionalColumns,
    initialColumnVisibility,
    renderCreateButton: () => <ExperimentCreateDialog projectId={projectId} />,
  });

  return (
    <AnalysisDashboard
      pageTitle={title}
      headerTitle={title}
      subheaderTitle={
        "Compare prompt versions and models on a fixed set of documents. Every run writes into its own virtual user " +
        "and is evaluated against the gold annotator."
      }
      table={table}
    />
  );
}
