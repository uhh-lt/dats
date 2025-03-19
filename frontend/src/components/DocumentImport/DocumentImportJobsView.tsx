import { Box, Divider, List, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import CrawlerHooks from "../../api/CrawlerHooks";
import PreProHooks from "../../api/PreProHooks";
import CrawlerJobListItem from "../ProjectSettings/backgroundtasks/CrawlerJobListItem";
import PreProJobListItem from "../ProjectSettings/backgroundtasks/PreProJobListItem";

interface DocumentImportJobsViewProps {
  projectId: number;
}

function DocumentImportJobsView({ projectId }: DocumentImportJobsViewProps) {
  // global server state (react-query)
  const { data: crawlerJobs } = CrawlerHooks.useGetAllCrawlerJobs(projectId);
  const { data: preproJobs } = PreProHooks.useGetAllPreProJobs(projectId);

  // Memoize all jobs
  const allCrawlerJobs = useMemo(() => crawlerJobs || [], [crawlerJobs]);
  const allPreproJobs = useMemo(() => preproJobs || [], [preproJobs]);

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Import Jobs
        </Typography>
        <Divider />
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
              <>
                <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, fontWeight: "bold" }}>
                  URL Import Jobs
                </Typography>
                {allCrawlerJobs.map((job) => (
                  <CrawlerJobListItem key={job.id} initialCrawlerJob={job} />
                ))}
              </>
            )}

            {/* File Upload Jobs */}
            {allPreproJobs.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
                  File Upload Jobs
                </Typography>
                {allPreproJobs.map((job) => (
                  <PreProJobListItem key={job.id} initialPreProJob={job} />
                ))}
              </>
            )}

            {/* Show message if no jobs */}
            {allCrawlerJobs.length === 0 && allPreproJobs.length === 0 && (
              <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
                No active import jobs
              </Typography>
            )}
          </List>
        </Box>
      </Box>
    </Box>
  );
}

export default memo(DocumentImportJobsView);
