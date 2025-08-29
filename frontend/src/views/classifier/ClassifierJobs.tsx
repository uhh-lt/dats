import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import ClassifierHooks from "../../api/ClassifierHooks.ts";
import ClassifierJobListItem from "../../components/BackgroundTasks/ClassifierJobListItem.tsx";
import { DialogSection } from "../../components/MUI/DialogSection.tsx";

interface ClassifierJobsProps {
  projectId: number;
}

function ClassifierJobs({ projectId }: ClassifierJobsProps) {
  const { data: classifierJobs, refetch, isFetching } = ClassifierHooks.useGetAllClassifierJobs(projectId);
  const allClassifierJobs = useMemo(() => classifierJobs || [], [classifierJobs]);

  return (
    <DialogSection
      title="Previous Classifier Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isFetching} onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {allClassifierJobs.length > 0 && (
          <Stack spacing={1}>
            {allClassifierJobs.map((job) => (
              <ClassifierJobListItem key={job.job_id} initialClassifierJob={job} />
            ))}
          </Stack>
        )}

        {allClassifierJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No classifier jobs...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}

export default ClassifierJobs;
