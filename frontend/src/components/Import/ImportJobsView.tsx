import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import ImportHooks from "../../api/ImportHooks.ts";
import ImportJobListItem from "../BackgroundTasks/ImportJobListItem.tsx";
import { DialogSection } from "../MUI/DialogSection.tsx";

interface ImportJobsViewProps {
  projectId: number;
}

function ImportJobsView({ projectId }: ImportJobsViewProps) {
  // global server state (react-query)
  const {
    data: importJobs,
    refetch: refetchImportJobs,
    isFetching: isImportFetching,
  } = ImportHooks.useGetAllImportJobs(projectId);

  // Memoize all jobs
  const allImportJobs = useMemo(() => importJobs || [], [importJobs]);

  // Handle refresh button click
  const handleRefresh = () => {
    refetchImportJobs();
  };

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
}

export default memo(ImportJobsView);
