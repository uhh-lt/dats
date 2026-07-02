import { DialogSection } from "@components/DialogSection";
import { MlJobRead } from "@models/MlJobRead";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { MLJobListItem } from "./MLJobListItem";

interface MLJobsViewProps {
  mlJobs: MlJobRead[];
  isMLFetching: boolean;
  onRefreshMLJobs: () => void;
}

export function MLJobsView({ mlJobs, isMLFetching, onRefreshMLJobs }: MLJobsViewProps) {
  return (
    <DialogSection
      title="Previous ML Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isMLFetching} onClick={onRefreshMLJobs}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {mlJobs.length > 0 && (
          <Stack spacing={1}>
            {mlJobs.map((job) => (
              <MLJobListItem key={job.job_id} initialMLJob={job} />
            ))}
          </Stack>
        )}

        {mlJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No ML jobs...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}
