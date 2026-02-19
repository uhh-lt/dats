import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import JobHooks from "../../../api/JobHooks.ts";
import MLJobListItem from "../../../components/BackgroundTasks/MLJobListItem.tsx";
import { DialogSection } from "../../../components/MUI/DialogSection.tsx";

interface MLJobsViewProps {
  projectId: number;
}

function MLJobsView({ projectId }: MLJobsViewProps) {
  const { data: mlJobs, refetch: refetchMLJobs, isFetching: isMLFetching } = JobHooks.useGetAllMLJobs(projectId);
  const allMLJobs = useMemo(() => mlJobs || [], [mlJobs]);

  const handleRefresh = () => {
    refetchMLJobs();
  };

  return (
    <DialogSection
      title="Previous ML Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isMLFetching} onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {allMLJobs.length > 0 && (
          <Stack spacing={1}>
            {allMLJobs.map((job) => (
              <MLJobListItem key={job.job_id} initialMLJob={job} />
            ))}
          </Stack>
        )}

        {allMLJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No ML jobs...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}

export default MLJobsView;
