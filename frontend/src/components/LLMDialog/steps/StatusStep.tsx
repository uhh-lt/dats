import { Button, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
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

  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  const handleNext = () => {
    if (llmJob.data && llmJob.data.status === BackgroundJobStatus.FINISHED && llmJob.data.result) {
      dispatch(CRUDDialogActions.llmDialogGoToResult({ result: llmJob.data.result }));
    } else {
      console.error("Job is not finished yet.");
    }
  };

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
            current={llmJob.isSuccess ? llmJob.data.num_steps_finished : 0}
            max={llmJob.isSuccess ? llmJob.data.num_steps_total : 0}
            tooltip={
              llmJob.isSuccess && llmJob.data.num_steps_finished === llmJob.data.num_steps_total
                ? `Status: All ${llmJob.data?.num_steps_total} steps are done.`
                : `Status: ${llmJob.data?.num_steps_finished} of ${llmJob.data?.num_steps_total} steps are done.`
            }
          />

          {llmJob.isSuccess && llmJob.data.status === BackgroundJobStatus.FINISHED && (
            <LLMUtterance>
              <Typography>I am done with document tagging. You can view the results now!</Typography>
            </LLMUtterance>
          )}

          <Typography mt={4} fontSize="0.9em" color="text.secondary">
            This may take a while. You can close the dialog and come back later. You can find all active LLM jobs in the
            AI Assistance menu.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          disabled={!llmJob.data || llmJob.data.status !== BackgroundJobStatus.FINISHED || !llmJob.data.result}
          onClick={handleNext}
        >
          View Results
        </Button>
      </DialogActions>
    </>
  );
}

export default StatusStep;
