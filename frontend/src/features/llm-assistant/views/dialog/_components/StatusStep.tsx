import { LinearProgressWithLabel } from "@components/progress-bars";
import { jobStatusToSimple, useLiveJob } from "@core/job";
import { JobStatus } from "@models/JobStatus";
import { Button, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { memo, useCallback, useMemo } from "react";
import { llmAssistantQueries } from "../../../api/llmAssistantQueries";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

export const StatusStep = memo(() => {
  // global state
  const jobId = useAppSelector((state) => state.llmAssistant.jobId);
  const dispatch = useAppDispatch();

  // poll the job
  const llmAssistantJob = useLiveJob(llmAssistantQueries.job.byId(jobId));

  const handleClose = useCallback(() => {
    dispatch(LLMAssistantActions.closeDialog());
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (llmAssistantJob.data && llmAssistantJob.data.status === JobStatus.FINISHED && llmAssistantJob.data.output) {
      dispatch(LLMAssistantActions.goToResult({ result: llmAssistantJob.data.output }));
    } else {
      console.error("Job is not finished yet.");
    }
  }, [llmAssistantJob.data, dispatch]);

  const progressTooltip = useMemo(() => {
    if (!llmAssistantJob.data) return "";
    return llmAssistantJob.data.current_step === llmAssistantJob.data.steps.length
      ? `Status: All ${llmAssistantJob.data?.steps.length} steps are done.`
      : `Status: ${llmAssistantJob.data?.current_step} of ${llmAssistantJob.data?.steps.length} steps are done.`;
  }, [llmAssistantJob.data]);

  const isNextDisabled = useMemo(
    () => !llmAssistantJob.data || llmAssistantJob.data.status !== JobStatus.FINISHED || !llmAssistantJob.data.output,
    [llmAssistantJob.data],
  );

  return (
    <>
      <DialogContent>
        <Stack gap={2}>
          <LLMAssistantUtterance>
            <Typography>I am working hard! Please wait ...</Typography>
          </LLMAssistantUtterance>
          <LinearProgressWithLabel
            sx={{ ml: 5 }}
            variant={llmAssistantJob.isSuccess ? "determinate" : "indeterminate"}
            current={llmAssistantJob.isSuccess ? llmAssistantJob.data.current_step : 0}
            max={Math.max(llmAssistantJob.isSuccess ? llmAssistantJob.data.steps.length - 1 : 0, 1)}
            tooltip={progressTooltip}
            failed={llmAssistantJob.isSuccess && jobStatusToSimple[llmAssistantJob.data.status] === "error"}
          />
          {llmAssistantJob.isSuccess && (
            <>
              <Typography variant="caption" color="textSecondary" textAlign="center" mt={-3}>
                Status: {llmAssistantJob.data.status} - {llmAssistantJob.data.status_message}
              </Typography>
              {llmAssistantJob.data.status === JobStatus.FINISHED ? (
                <LLMAssistantUtterance>
                  <Typography>
                    I am done with {llmAssistantJob.data.input.task_type.toLowerCase()}. You can view the results now!
                  </Typography>
                </LLMAssistantUtterance>
              ) : llmAssistantJob.data.status === JobStatus.FAILED ? (
                <LLMAssistantUtterance>
                  <Typography>An error occurred! I am very sorry. You can close this dialog now...</Typography>
                </LLMAssistantUtterance>
              ) : null}
            </>
          )}
          <Typography mt={4} fontSize="0.9em" color="textSecondary">
            This may take a while. You can close the dialog and come back later. You can find all LLM Assistant jobs by
            opening the LLM Assistant again.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button disabled={isNextDisabled} onClick={handleNext}>
          View Results
        </Button>
      </DialogActions>
    </>
  );
});
