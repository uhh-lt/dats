import { DialogSection } from "@components/DialogSection";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { ClassifierJobListItem } from "./ClassifierJobListItem";

interface ClassifierJobsProps {
  classifierJobs: ClassifierJobRead[];
  isFetching: boolean;
  onRefresh: () => void;
}

export function ClassifierJobs({ classifierJobs, isFetching, onRefresh }: ClassifierJobsProps) {
  return (
    <DialogSection
      title="Previous Classifier Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isFetching} onClick={onRefresh}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {classifierJobs.length > 0 && (
          <Stack spacing={1}>
            {classifierJobs.map((job) => (
              <ClassifierJobListItem key={job.job_id} initialClassifierJob={job} />
            ))}
          </Stack>
        )}

        {classifierJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No classifier jobs...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}
