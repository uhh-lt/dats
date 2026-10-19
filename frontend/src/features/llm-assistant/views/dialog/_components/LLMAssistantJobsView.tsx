import { DialogSection } from "@components/DialogSection";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, List, Stack, Tooltip, Typography } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { llmAssistantQueries } from "../../../api/llmAssistantQueries";
import { LLMAssistantJobListItem } from "./LLMAssistantJobListItem";

export function LLMAssistantJobsView() {
  const projectId = useAppSelector((state) => state.project.projectId);

  const {
    data: llmAssistantJobs,
    refetch: refetchLLMAssistantJobs,
    isFetching: isFetchingLLMAssistantJobs,
  } = useQuery({
    ...llmAssistantQueries.job.byProject(projectId ?? 0),
    enabled: projectId !== undefined,
  });
  const allLLMAssistantJobs = useMemo(() => llmAssistantJobs || [], [llmAssistantJobs]);

  const handleRefresh = () => {
    refetchLLMAssistantJobs();
  };

  return (
    <DialogSection
      title="Previous LLM Assistant Jobs"
      action={
        <Tooltip title="Refresh Jobs">
          <span>
            <IconButton loading={isFetchingLLMAssistantJobs} onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {allLLMAssistantJobs.length > 0 && (
          <Stack spacing={1}>
            {allLLMAssistantJobs.map((job) => (
              <LLMAssistantJobListItem key={job.job_id} initialLLMAssistantJob={job} />
            ))}
          </Stack>
        )}

        {/* Show message if no jobs */}
        {allLLMAssistantJobs.length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 2 }}>
            No LLM Assistant jobs...
          </Typography>
        )}
      </List>
    </DialogSection>
  );
}
