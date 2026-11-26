import { DialogSection } from "@components/DialogSection";
import { useRefreshJobs } from "@core/job";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { memo, useMemo } from "react";
import { importQueries } from "../../../../../api/importQueries";
import { ImportJobListItem } from "./ImportJobListItem";

interface ImportJobsViewProps {
  projectId: number;
}

export const ImportJobsView = memo(({ projectId }: ImportJobsViewProps) => {
  // global server state (react-query)
  const { data: importJobs } = useQuery(importQueries.job.byProject(projectId));

  // Memoize all jobs
  const allImportJobs = useMemo(() => importJobs || [], [importJobs]);

  // the list and the jobs its items follow
  const { refresh: handleRefresh, isFetching: isImportFetching } = useRefreshJobs(importQueries.job, projectId);

  return (
    <DialogSection
      title="Previous Import Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isImportFetching} onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {allImportJobs.length > 0 && (
          <Stack spacing={1}>
            {allImportJobs.map((job) => (
              <ImportJobListItem key={job.job_id} initialImportJob={job} />
            ))}
          </Stack>
        )}

        {/* Show message if no jobs */}
        {allImportJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No import jobs yet...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
});
