import { Button, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LinearProgressWithLabel from "../../LinearProgressWithLabel.tsx";
import LLMUtterance from "./LLMUtterance.tsx";

function StatusStep() {
  // global state
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);
  const dispatch = useAppDispatch();

  // poll the job
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (llmJob.data && llmJob.data.status === BackgroundJobStatus.FINISHED && llmJob.data.result) {
      dispatch(CRUDDialogActions.llmDialogGoToResult({ result: llmJob.data.result }));
    } else {
      console.error("Job is not finished yet.");
    }
  }, [llmJob.data, dispatch]);

  const progressTooltip = useMemo(() => {
    if (!llmJob.data) return "";
    return llmJob.data.current_step === llmJob.data.num_steps_total
      ? `Status: All ${llmJob.data?.num_steps_total} steps are done.`
      : `Status: ${llmJob.data?.current_step} of ${llmJob.data?.num_steps_total} steps are done.`;
  }, [llmJob.data]);

  const isNextDisabled = useMemo(
    () => !llmJob.data || llmJob.data.status !== BackgroundJobStatus.FINISHED || !llmJob.data.result,
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
            max={llmJob.isSuccess ? llmJob.data.num_steps_total : 0}
            tooltip={progressTooltip}
          />
          {llmJob.isSuccess && (
            <>
              <Typography variant="caption" color="textSecondary" textAlign="center" mt={-3}>
                Status: {llmJob.data.status} - {llmJob.data.current_step_description}
              </Typography>
              {llmJob.data.status === BackgroundJobStatus.FINISHED ? (
                <LLMUtterance>
                  <Typography>
                    I am done with {llmJob.data.parameters.llm_job_type.toLowerCase()}. You can view the results now!
                  </Typography>
                </LLMUtterance>
              ) : llmJob.data.status === BackgroundJobStatus.ERRORNEOUS ? (
                <LLMUtterance>
                  <Typography>An error occurred! I am very sorry. You can close this dialog now...</Typography>
                </LLMUtterance>
              ) : null}
            </>
          )}
          <Typography mt={4} fontSize="0.9em" color="textSecondary">
            This may take a while. You can close the dialog and come back later. You can find all active LLM jobs in
            Project Settings &gt; Background Tasks.
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
}

export default memo(StatusStep);
