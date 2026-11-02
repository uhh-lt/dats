import { ExperimentRead } from "@models/ExperimentRead";
import { JobStatus } from "@models/JobStatus";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Button, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { ExperimentHooks } from "../../../api/experimentHooks";

interface RefreshAllRunsButtonProps {
  experiment: ExperimentRead;
}

/**
 * Recomputes the scores of all finished runs in one request, so that all runs are scored against the same state of
 * the gold annotator. Disabled without a gold annotator (it was deleted) and without finished runs.
 */
export function RefreshAllRunsButton({ experiment }: RefreshAllRunsButtonProps) {
  const { mutate: refreshAllMutation, isPending } = ExperimentHooks.useRefreshAllRunScores();
  const handleRefreshAll = useCallback(
    () => refreshAllMutation({ experimentId: experiment.id }),
    [experiment.id, refreshAllMutation],
  );

  const hasGoldAnnotator = experiment.gold_user_id !== null;
  const hasFinishedRuns = experiment.runs.some((run) => run.status === JobStatus.FINISHED);
  let tooltip = "Recompute the scores of all finished runs, e.g. after the gold annotator changed annotations";
  if (!hasGoldAnnotator) tooltip = "The gold annotator was deleted";
  else if (!hasFinishedRuns) tooltip = "No run has finished yet";

  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefreshAll}
          disabled={!hasGoldAnnotator || !hasFinishedRuns}
          loading={isPending}
          loadingPosition="start"
          sx={{ flexShrink: 0 }}
        >
          Refresh all runs
        </Button>
      </span>
    </Tooltip>
  );
}
