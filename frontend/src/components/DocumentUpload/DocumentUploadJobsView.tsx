import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import CrawlerHooks from "../../api/CrawlerHooks";
import PreProHooks from "../../api/PreProHooks";
import { DialogSection } from "../MUI/DialogSection";
import CrawlerJobListItem from "../ProjectSettings/backgroundtasks/CrawlerJobListItem";
import PreProJobListItem from "../ProjectSettings/backgroundtasks/PreProJobListItem";

interface DocumentImportJobsViewProps {
  projectId: number;
}

function DocumentUploadJobsView({ projectId }: DocumentImportJobsViewProps) {
  // global server state (react-query)
  const {
    data: crawlerJobs,
    refetch: refetchCrawlerJobs,
    isFetching: isCrawlerFetching,
  } = CrawlerHooks.useGetAllCrawlerJobs(projectId);
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
      title="Import Jobs"
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
      <Box
        sx={{
          height: "300px",
          overflow: "auto",
          // Add subtle inner shadow at top when scrolled
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 10px)",
          backgroundRepeat: "no-repeat",
        }}
      >
        <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
          {/* URL Import Jobs */}
          {allCrawlerJobs.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1 }}>
                URL Import Jobs
              </Typography>
              {allCrawlerJobs.map((job) => (
                <CrawlerJobListItem key={job.id} initialCrawlerJob={job} />
              ))}
            </Stack>
          )}

          {/* File Upload Jobs */}
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
              No import jobs...
            </Typography>
          )}
        </List>
      </Box>
    </DialogSection>
  );
}

export default memo(DocumentUploadJobsView);
