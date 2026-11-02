import { getIconComponent, Icon } from "@components/icons";
import { OpenInTabsButton, useTabNavigate } from "@core/navigation";
import { useOpenConfirmationDialog } from "@core/notification";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { AgreementScoring } from "@models/AgreementScoring";
import { ExperimentRead } from "@models/ExperimentRead";
import { ExperimentRunLogFormat } from "@models/ExperimentRunLogFormat";
import { ExperimentRunRead } from "@models/ExperimentRunRead";
import { TaskType } from "@models/TaskType";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import { downloadFile } from "@utils/downloadUtils";
import { MouseEvent, useCallback, useMemo, useState } from "react";
import { ExperimentHooks } from "../../../api/experimentHooks";
import { comparisonSearch } from "../_utils/runUtils";

interface RunActionsProps {
  projectId: number;
  experiment: ExperimentRead;
  run: ExperimentRunRead;
  scoring: AgreementScoring;
  onDeleted: () => void;
}

/**
 * The actions of a run: the agreement evaluation of the gold annotator and the run's virtual user, refreshing the
 * scores, downloading the run log, opening all comparison views and deleting the run.
 */
export function RunActions({ projectId, experiment, run, scoring, onDeleted }: RunActionsProps) {
  // links
  const tabNavigate = useTabNavigate();
  const handleOpenAgreement = useCallback(() => {
    tabNavigate({
      to: "/project/$projectId/analysis/agreement",
      params: { projectId },
      search: {
        referenceUserId: experiment.gold_user_id ?? undefined,
        comparedUserId: run.virtual_user_id,
        annotationType:
          experiment.task_type === TaskType.ANNOTATION
            ? AgreementAnnotationType.SPAN
            : AgreementAnnotationType.SENTENCE,
        scoring,
        codeIds: experiment.code_ids,
        sdocIds: run.sdoc_ids,
      },
    });
  }, [experiment, projectId, run, scoring, tabNavigate]);
  const search = useMemo(() => comparisonSearch(experiment, run), [experiment, run]);

  // scores and log
  const { mutate: refreshScoresMutation, isPending: isRefreshing } = ExperimentHooks.useRefreshRunScores();
  const { mutate: exportLogMutation, isPending: isExporting } = ExperimentHooks.useExportRunLog();
  const handleRefresh = useCallback(() => refreshScoresMutation({ runId: run.id }), [refreshScoresMutation, run.id]);
  const [logMenuAnchor, setLogMenuAnchor] = useState<HTMLElement | null>(null);
  const handleOpenLogMenu = useCallback((event: MouseEvent<HTMLElement>) => setLogMenuAnchor(event.currentTarget), []);
  const handleCloseLogMenu = useCallback(() => setLogMenuAnchor(null), []);
  const handleExport = useCallback(
    (exportFormat: ExperimentRunLogFormat) => {
      setLogMenuAnchor(null);
      exportLogMutation(
        { runId: run.id, exportFormat },
        { onSuccess: (url) => downloadFile(encodeURI("/content/" + url)) },
      );
    },
    [exportLogMutation, run.id],
  );

  // deletion
  const { mutate: deleteRunMutation, isPending: isDeleting } = ExperimentHooks.useDeleteRun();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDelete = useCallback(() => {
    openConfirmationDialog({
      text:
        `Do you really want to delete run ${run.name}? Its virtual user is deleted with all its annotations. ` +
        "This action cannot be undone!",
      onAccept: () => {
        deleteRunMutation({ runId: run.id });
        onDeleted();
      },
    });
  }, [deleteRunMutation, onDeleted, openConfirmationDialog, run.id, run.name]);

  // clicks on the actions must not expand the run
  const handleStopPropagation = useCallback((event: MouseEvent) => event.stopPropagation(), []);

  return (
    <Box sx={{ display: "flex", flexWrap: "nowrap" }} onClick={handleStopPropagation}>
      <Tooltip title="Agreement evaluation">
        <IconButton onClick={handleOpenAgreement}>{getIconComponent(Icon.AGREEMENT)}</IconButton>
      </Tooltip>
      <Tooltip title="Recompute the scores, e.g. after the gold annotator changed annotations">
        <span>
          <IconButton aria-label="Recompute the scores" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Download the run log">
        <span>
          <IconButton aria-label="Download the run log" onClick={handleOpenLogMenu} loading={isExporting}>
            {getIconComponent(Icon.EXPORT)}
          </IconButton>
        </span>
      </Tooltip>
      <Menu anchorEl={logMenuAnchor} open={Boolean(logMenuAnchor)} onClose={handleCloseLogMenu}>
        <MenuItem onClick={() => handleExport(ExperimentRunLogFormat.JSON)}>JSON</MenuItem>
        <MenuItem onClick={() => handleExport(ExperimentRunLogFormat.CSV)}>CSV</MenuItem>
      </Menu>
      <OpenInTabsButton
        sdocIds={run.sdoc_ids}
        projectId={projectId}
        search={search}
        tooltip="Open all comparison views"
      />
      <Tooltip title="Delete the run with its virtual user">
        <span>
          <IconButton aria-label="Delete the run" color="error" onClick={handleDelete} loading={isDeleting}>
            {getIconComponent(Icon.DELETE)}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
