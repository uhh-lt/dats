import { LLMHooks } from "@api/hooks/LLMHooks";
import { DialogSection } from "@components/DialogSection";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { useAppSelector } from "@plugins/redux";
import { useMemo } from "react";
import { LLMJobListItem } from "./LLMJobListItem";

export function LLMJobsView() {
  const projectId = useAppSelector((state) => state.project.projectId);

  const { data: llmJobs, refetch: refetchLLMJobs, isFetching: isLLMFetching } = LLMHooks.useGetAllLLMJobs(projectId);
  const allLLMJobs = useMemo(() => llmJobs || [], [llmJobs]);

  const handleRefresh = () => {
    refetchLLMJobs();
  };

  return (
    <DialogSection
      title="Previous LLM Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isLLMFetching} onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {allLLMJobs.length > 0 && (
          <Stack spacing={1}>
            {allLLMJobs.map((job) => (
              <LLMJobListItem key={job.job_id} initialLLMJob={job} />
            ))}
          </Stack>
        )}

        {/* Show message if no jobs */}
        {allLLMJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No LLM jobs...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}
