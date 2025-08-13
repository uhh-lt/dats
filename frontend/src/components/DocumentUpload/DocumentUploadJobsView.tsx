import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import JobHooks from "../../api/JobHooks.ts";
import PreProHooks from "../../api/PreProHooks";
import CrawlerJobListItem from "../BackgroundTasks/CrawlerJobListItem";
import PreProJobListItem from "../BackgroundTasks/PreProJobListItem";
import { DialogSection } from "../MUI/DialogSection";

interface DocumentImportJobsViewProps {
  projectId: number;
}

function DocumentUploadJobsView({ projectId }: DocumentImportJobsViewProps) {
  // global server state (react-query)
  const {
    data: crawlerJobs,
    refetch: refetchCrawlerJobs,
    isFetching: isCrawlerFetching,
  } = JobHooks.useGetAllCrawlerJobs(projectId);
  const {
    data: preproJobs,
    refetch: refetchPreproJobs,
    isFetching: isPreproFetching,
  } = PreProHooks.useGetAllPreProJobs(projectId);

  // Memoize all jobs
  const allCrawlerJobs = useMemo(() => crawlerJobs || [], [crawlerJobs]);
  const allPreproJobs = useMemo(() => preproJobs || [], [preproJobs]);

  const handleRefresh = () => {
    refetchCrawlerJobs();
    refetchPreproJobs();
  };

  return (
    <DialogSection
      title="Upload Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isCrawlerFetching || isPreproFetching} onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {allCrawlerJobs.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1 }}>
              URL Upload Jobs
            </Typography>
            {allCrawlerJobs.map((job) => (
              <CrawlerJobListItem key={job.job_id} initialCrawlerJob={job} />
            ))}
          </Stack>
        )}

        {allPreproJobs.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              File Upload Jobs
            </Typography>
            {allPreproJobs.map((job) => (
              <PreProJobListItem key={job.id} initialPreProJob={job} />
            ))}
          </Stack>
        )}

        {/* Show message if no jobs */}
        {allCrawlerJobs.length === 0 && allPreproJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No upload jobs...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}

export default memo(DocumentUploadJobsView);
