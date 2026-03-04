import { LLMHooks } from "@api/hooks/LLMHooks";
import { JobStatus } from "@api/models/JobStatus";
import { LinearProgressWithLabel } from "@components/progress-bars";
import { Button, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { memo, useCallback, useMemo } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMUtterance } from "./LLMUtterance";

export const StatusStep = memo(() => {
  // global state
  const llmJobId = useAppSelector((state) => state.llmAssistant.llmJobId);
  const dispatch = useAppDispatch();

  // poll the job
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  const handleClose = useCallback(() => {
    dispatch(LLMAssistantActions.closeLLMDialog());
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (llmJob.data && llmJob.data.status === JobStatus.FINISHED && llmJob.data.output) {
      dispatch(LLMAssistantActions.llmDialogGoToResult({ result: llmJob.data.output }));
    } else {
      console.error("Job is not finished yet.");
    }
  }, [llmJob.data, dispatch]);

  const progressTooltip = useMemo(() => {
    if (!llmJob.data) return "";
    return llmJob.data.current_step === llmJob.data.steps.length
      ? `Status: All ${llmJob.data?.steps.length} steps are done.`
      : `Status: ${llmJob.data?.current_step} of ${llmJob.data?.steps.length} steps are done.`;
  }, [llmJob.data]);

  const isNextDisabled = useMemo(
    () => !llmJob.data || llmJob.data.status !== JobStatus.FINISHED || !llmJob.data.output,
    [llmJob.data],
  );

  return (
    <>
      <DialogContent>
        <Stack gap={2}>
          <LLMUtterance>
            <Typography>I am working hard! Please wait ...</Typography>
          </LLMUtterance>
          <LinearProgressWithLabel
            sx={{ ml: 5 }}
            variant={llmJob.isSuccess ? "determinate" : "indeterminate"}
            current={llmJob.isSuccess ? llmJob.data.current_step : 0}
            max={llmJob.isSuccess ? llmJob.data.steps.length - 1 : 0}
            tooltip={progressTooltip}
          />
          {llmJob.isSuccess && (
            <>
              <Typography variant="caption" color="textSecondary" textAlign="center" mt={-3}>
                Status: {llmJob.data.status} - {llmJob.data.status_message}
              </Typography>
              {llmJob.data.status === JobStatus.FINISHED ? (
                <LLMUtterance>
                  <Typography>
                    I am done with {llmJob.data.input.llm_job_type.toLowerCase()}. You can view the results now!
                  </Typography>
                </LLMUtterance>
              ) : llmJob.data.status === JobStatus.FAILED ? (
                <LLMUtterance>
                  <Typography>An error occurred! I am very sorry. You can close this dialog now...</Typography>
                </LLMUtterance>
              ) : null}
            </>
          )}
          <Typography mt={4} fontSize="0.9em" color="textSecondary">
            This may take a while. You can close the dialog and come back later. You can find all LLM jobs by opening
            the LLM Assistant again.
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
