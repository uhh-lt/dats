import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import DocProcessingHooks from "../../api/DocProcessingHooks.ts";
import CrawlerJobListItem from "../BackgroundTasks/CrawlerJobListItem";
import { DialogSection } from "../MUI/DialogSection";
import SdocStatusSimpleListItem from "./SdocStatusListItem.tsx";

interface DocumentImportJobsViewProps {
  projectId: number;
}

function DocumentUploadJobsView({ projectId }: DocumentImportJobsViewProps) {
  // global server state (react-query)
  const {
    data: crawlerJobs,
    refetch: refetchCrawlerJobs,
    isFetching: isCrawlerFetching,
  } = DocProcessingHooks.useGetAllCrawlerJobs(projectId);
  const {
    data: sdocStatus,
    refetch: refetchSdocStatus,
    isFetching: isSdocStatusFetching,
  } = DocProcessingHooks.usePollProcessingSimpleSdocStatus(projectId);

  // Memoize all jobs
  const allCrawlerJobs = useMemo(() => crawlerJobs || [], [crawlerJobs]);
  const allSdocStatus = useMemo(() => sdocStatus || [], [sdocStatus]);

  const handleRefresh = () => {
    refetchCrawlerJobs();
    refetchSdocStatus();
  };

  return (
    <DialogSection
      title="Upload Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isCrawlerFetching || isSdocStatusFetching} onClick={handleRefresh}>
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

        {allSdocStatus.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              Documents in progress
            </Typography>
            {allSdocStatus.map((status) => (
              <SdocStatusSimpleListItem key={status.name} sdocStatus={status} />
            ))}
          </Stack>
        )}

        {/* Show message if no jobs */}
        {allCrawlerJobs.length === 0 && allSdocStatus.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No uploads ...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}

export default memo(DocumentUploadJobsView);
