import { ContentContainerLayout } from "@components/content-layouts";
import { Alert, Stack } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { ExperimentHeader } from "./_components/ExperimentHeader";
import { RunTable } from "./_components/RunTable";
import { ExperimentRouteAPI } from "./_hooks/experimentRouteAPI";

/** One experiment: its settings in the header, all runs side by side with their details. */
export function ExperimentView() {
  const { projectId, experimentId } = ExperimentRouteAPI.useParams();
  const { runId, scoring } = ExperimentRouteAPI.useSearch();
  const navigate = ExperimentRouteAPI.useNavigate();
  const { experimentsByProjectOptions } = ExperimentRouteAPI.useRouteContext();
  const { data: experiment } = useSuspenseQuery({
    ...experimentsByProjectOptions,
    select: (data) => data[experimentId],
  });

  // the expanded run is kept in the URL
  const handleExpandRun = useCallback(
    (id: number | undefined) => {
      navigate({ search: (prev) => ({ ...prev, runId: id }), replace: true });
    },
    [navigate],
  );

  // the experiment was deleted (e.g. by a colleague)
  if (!experiment) {
    return (
      <ContentContainerLayout>
        <Alert severity="info">
          This experiment was deleted.{" "}
          <Link to="/project/$projectId/experiments" params={{ projectId }}>
            Open the experiments
          </Link>
        </Alert>
      </ContentContainerLayout>
    );
  }

  return (
    <ContentContainerLayout>
      <Stack spacing={2} className="h100">
        <ExperimentHeader experiment={experiment} />
        {experiment.gold_user_id === null && (
          <Alert severity="warning" sx={{ flexShrink: 0 }}>
            The gold annotator of this experiment was deleted. The runs keep their stored scores, but new runs and
            refreshing the scores are disabled.
          </Alert>
        )}
        <RunTable
          projectId={projectId}
          experiment={experiment}
          scoring={scoring}
          expandedRunId={runId}
          onExpandRun={handleExpandRun}
        />
      </Stack>
    </ContentContainerLayout>
  );
}
