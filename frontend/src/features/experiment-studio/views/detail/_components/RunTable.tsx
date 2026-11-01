import { AgreementScoringSelector } from "@components/AgreementScoringSelector";
import { CardContainer } from "@components/CardContainer";
import { CodeHooks, CodeRenderer } from "@core/code";
import { useTabNavigate } from "@core/navigation";
import { promptQueries } from "@core/prompt";
import { UserHooks, UserRenderer } from "@core/user";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { AgreementScore } from "@models/AgreementScore";
import { AgreementScoring } from "@models/AgreementScoring";
import { ExperimentRead } from "@models/ExperimentRead";
import { ExperimentRunRead } from "@models/ExperimentRunRead";
import { ExperimentRunScores } from "@models/ExperimentRunScores";
import { TaskType } from "@models/TaskType";
import { Chip, Link, Stack, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@utils/DateUtils";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  MRT_VisibilityState,
  useMaterialReactTable,
} from "material-react-table";
import { MouseEvent, useCallback, useMemo } from "react";
import {
  findScores,
  formatScore,
  RUN_STATUS_COLORS,
  RUN_STATUSES,
  shortModelName,
} from "../../../_utils/experimentUtils";
import { ExperimentRouteAPI } from "../_hooks/experimentRouteAPI";
import { RunActions } from "./RunActions";
import { RunDetails } from "./RunDetails";
import { RunStartDialog } from "./RunStartDialog";

// the per-code scores and the details of a run are columns users can show, but they are hidden at first
const HIDDEN_COLUMNS = ["virtualUser", "startedBy", "finished", "updated", "scoresComputed"];
const codeColumnId = (codeId: number) => `code-${codeId}`;

/**
 * A run with the values of its columns that do not come from the run. The table caches the column values of a row
 * until its data changes, so the rows are rebuilt whenever one of these values changes.
 */
interface RunRow extends ExperimentRunRead {
  // undefined until the prompts are loaded
  prompt: PromptVersionLabel | undefined;
  // the user names, undefined until the users are loaded
  virtualUserName: string | undefined;
  startedByName: string | undefined;
  // the stored scores of the selected scoring
  selectedScores: ExperimentRunScores | undefined;
}

/** A date column that is searched and filtered as displayed and sorted by time. */
function dateColumn(
  id: string,
  header: string,
  getDate: (run: RunRow) => string | null,
  size?: number,
): MRT_ColumnDef<RunRow> {
  return {
    id,
    header,
    size,
    accessorFn: (run) => {
      const date = getDate(run);
      return date ? formatDateTime(date) : "–";
    },
    sortingFn: (rowA, rowB) => (getDate(rowA.original) ?? "").localeCompare(getDate(rowB.original) ?? ""),
  };
}

interface PromptVersionLabel {
  promptId: number;
  label: string;
}

interface RunTableProps {
  projectId: number;
  experiment: ExperimentRead;
  scoring: AgreementScoring;
  expandedRunId: number | undefined;
  onExpandRun: (runId: number | undefined) => void;
}

/** All runs of the experiment side by side; a run expands to its details. */
export function RunTable({ projectId, experiment, scoring, expandedRunId, onExpandRun }: RunTableProps) {
  const navigate = ExperimentRouteAPI.useNavigate();
  const handleChangeScoring = useCallback(
    (value: AgreementScoring) => navigate({ search: (prev) => ({ ...prev, scoring: value }), replace: true }),
    [navigate],
  );

  // the prompt and version number of every version (archived prompts included)
  const prompts = useQuery(promptQueries.byProject(projectId));
  const versionLabels = useMemo(() => {
    const labels: Record<number, PromptVersionLabel> = {};
    Object.values(prompts.data ?? {}).forEach((prompt) =>
      prompt.versions.forEach((version) => {
        labels[version.id] = { promptId: prompt.id, label: `${prompt.name} · v${version.version}` };
      }),
    );
    return labels;
  }, [prompts.data]);
  const codes = CodeHooks.useGetAllCodesMap();

  // the user columns are searched and filtered by the user names
  const users = UserHooks.useGetAllUsers();
  const userNames = useMemo(
    () => new Map(users.data?.map((user) => [user.id, `${user.first_name} ${user.last_name}`.trim()])),
    [users.data],
  );

  // the prompt column links to the prompt builder at the run's version
  const tabNavigate = useTabNavigate();
  const handleOpenPrompt = useCallback(
    (promptId: number, versionId: number) => {
      tabNavigate({ to: "/project/$projectId/prompts", params: { projectId }, search: { promptId, versionId } });
    },
    [projectId, tabNavigate],
  );

  const data = useMemo<RunRow[]>(
    () =>
      experiment.runs.map((run) => ({
        ...run,
        prompt: versionLabels[run.prompt_version_id],
        virtualUserName: userNames.get(run.virtual_user_id),
        startedByName: run.user_id === null ? undefined : userNames.get(run.user_id),
        selectedScores: findScores(run, scoring),
      })),
    [experiment.runs, scoring, userNames, versionLabels],
  );

  const columns = useMemo<MRT_ColumnDef<RunRow>[]>(
    () => [
      { id: "name", size: 140, header: "Run", accessorFn: (run) => run.name },
      {
        id: "prompt",
        size: 220,
        header: "Prompt",
        accessorFn: (run) => run.prompt?.label ?? `Version ${run.prompt_version_id}`,
        Cell: ({ row, renderedCellValue }) => {
          const version = row.original.prompt;
          if (!version) return renderedCellValue;
          return (
            <Link
              component="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                handleOpenPrompt(version.promptId, row.original.prompt_version_id);
              }}
            >
              {version.label}
            </Link>
          );
        },
      },
      { id: "model", size: 200, header: "Model", accessorFn: (run) => shortModelName(run.model) },
      {
        id: "status",
        size: 110,
        header: "Status",
        accessorFn: (run) => run.status,
        filterVariant: "select",
        filterSelectOptions: RUN_STATUSES,
        Cell: ({ row }) => (
          <Chip size="small" label={row.original.status} color={RUN_STATUS_COLORS[row.original.status]} />
        ),
      },
      {
        id: "precision",
        size: 110,
        header: "Precision",
        accessorFn: (run) => run.selectedScores?.total.precision ?? undefined,
        Cell: ({ row }) => formatScore(row.original.selectedScores?.total.precision),
        sortUndefined: "last",
        filterVariant: "range",
        enableGlobalFilter: false,
      },
      {
        id: "recall",
        size: 100,
        header: "Recall",
        accessorFn: (run) => run.selectedScores?.total.recall ?? undefined,
        Cell: ({ row }) => formatScore(row.original.selectedScores?.total.recall),
        sortUndefined: "last",
        filterVariant: "range",
        enableGlobalFilter: false,
      },
      {
        id: "f1",
        size: 90,
        header: "F1",
        accessorFn: (run) => run.selectedScores?.total.f1 ?? undefined,
        Cell: ({ row }) => <ScoreCell score={row.original.selectedScores?.total} />,
        sortUndefined: "last",
        filterVariant: "range",
        enableGlobalFilter: false,
      },
      ...experiment.code_ids.map<MRT_ColumnDef<RunRow>>((codeId) => ({
        id: codeColumnId(codeId),
        size: 110,
        header: `F1 ${codes.data?.[codeId]?.name ?? codeId}`,
        Header: () => (
          <Tooltip title="F1 of the code">
            <span>
              <CodeRenderer code={codeId} />
            </span>
          </Tooltip>
        ),
        accessorFn: (run) => codeScore(run, codeId)?.f1 ?? undefined,
        Cell: ({ row }) => <ScoreCell score={codeScore(row.original, codeId)} />,
        sortUndefined: "last",
        filterVariant: "range",
        enableGlobalFilter: false,
      })),
      {
        id: "virtualUser",
        header: "Virtual user",
        accessorFn: (run) => run.virtualUserName ?? `User ${run.virtual_user_id}`,
        Cell: ({ row }) => <UserRenderer user={row.original.virtual_user_id} />,
      },
      {
        id: "startedBy",
        header: "Started by",
        accessorFn: (run) => (run.user_id === null ? "–" : (run.startedByName ?? `User ${run.user_id}`)),
        Cell: ({ row }) => (row.original.user_id === null ? "–" : <UserRenderer user={row.original.user_id} />),
      },
      dateColumn("started", "Started", (run) => run.started ?? run.created, 180),
      dateColumn("finished", "Finished", (run) => run.finished),
      dateColumn("updated", "Updated", (run) => run.updated),
      dateColumn("scoresComputed", "Scores computed", (run) => run.scores_computed),
    ],
    [codes.data, experiment.code_ids, handleOpenPrompt],
  );
  const columnVisibility = useMemo<MRT_VisibilityState>(
    () => Object.fromEntries([...HIDDEN_COLUMNS, ...experiment.code_ids.map(codeColumnId)].map((id) => [id, false])),
    [experiment.code_ids],
  );

  // one run is expanded at a time; it is kept in the URL
  const handleToggleRun = useCallback(
    (runId: number) => onExpandRun(runId === expandedRunId ? undefined : runId),
    [expandedRunId, onExpandRun],
  );

  const table = useMaterialReactTable<RunRow>({
    data,
    columns,
    getRowId: (run) => `${run.id}`,
    state: {
      expanded: expandedRunId === undefined ? {} : { [`${expandedRunId}`]: true },
    },
    initialState: { columnVisibility, density: "compact" },
    // styling
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    enableStickyHeader: true,
    // no pagination: an experiment has few runs
    enablePagination: false,
    enableBottomToolbar: false,
    // rows expand to the details of the run
    renderDetailPanel: ({ row }) => <RunDetails projectId={projectId} experiment={experiment} run={row.original} />,
    // the details start where the text of the first column (the run name) starts: after the expand column and the
    // cell padding of the compact density
    muiDetailPanelProps: ({ table }) => ({
      sx: { pl: `calc(${table.getColumn("mrt-row-expand").getSize()}px + 0.5rem)` },
    }),
    muiExpandButtonProps: ({ row }) => ({
      onClick: (event) => {
        event.stopPropagation();
        handleToggleRun(row.original.id);
      },
    }),
    // the detail panel row gets these props too: clicks inside the details must not collapse the run
    muiTableBodyRowProps: ({ row, isDetailPanel }) =>
      isDetailPanel ? {} : { onClick: () => handleToggleRun(row.original.id), sx: { cursor: "pointer" } },
    // actions
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: { "mrt-row-actions": { size: 230 } },
    renderRowActions: ({ row }) => (
      <RunActions
        projectId={projectId}
        experiment={experiment}
        run={row.original}
        scoring={scoring}
        onDeleted={() => row.original.id === expandedRunId && onExpandRun(undefined)}
      />
    ),
    // search: the default fuzzy search matches unrelated runs, e.g. "Claims" a run of the experiment "Climate"
    globalFilterFn: "contains",
    // toolbar: search, filters, columns and density
    renderToolbarInternalActions: ({ table }) => (
      <>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </>
    ),
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" spacing={2} alignItems="center">
        <RunStartDialog projectId={projectId} experiment={experiment} onRunStarted={onExpandRun} />
        <AgreementScoringSelector
          annotationType={
            experiment.task_type === TaskType.ANNOTATION
              ? AgreementAnnotationType.SPAN
              : AgreementAnnotationType.SENTENCE
          }
          scoring={scoring}
          onScoringChange={handleChangeScoring}
          sx={{ minWidth: 200 }}
        />
      </Stack>
    ),
    renderEmptyRowsFallback: () => (
      <Typography color="textSecondary" sx={{ p: 2 }}>
        {experiment.runs.length === 0
          ? 'No runs yet. Start the first run with "Start new run". Every run is evaluated against the gold annotator ' +
            "when it finishes."
          : "No run matches the search and filters."}
      </Typography>
    ),
  });

  return (
    <CardContainer variant="outlined" className="myFlexContainer myFlexFillAllContainer">
      <div className="myFlexFillAllContainer">
        <MaterialReactTable table={table} />
      </div>
    </CardContainer>
  );
}

/** The score of one code of the run with the selected scoring, undefined until the scores are computed. */
function codeScore(run: RunRow, codeId: number): AgreementScore | undefined {
  return run.selectedScores?.code_scores.find((score) => score.code_id === codeId);
}

/** The F1 of a score, with precision, recall and the counts in the tooltip. */
function ScoreCell({ score }: { score: AgreementScore | undefined }) {
  if (!score) return <>–</>;
  return (
    <Tooltip
      title={
        `Precision ${formatScore(score.precision)}, recall ${formatScore(score.recall)} ` +
        `(TP ${score.true_positives}, FP ${score.false_positives}, FN ${score.false_negatives})`
      }
    >
      <b>{formatScore(score.f1)}</b>
    </Tooltip>
  );
}
