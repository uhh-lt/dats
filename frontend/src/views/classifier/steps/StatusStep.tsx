import { Button, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import ClassifierHooks from "../../../api/ClassifierHooks.ts";
import { JobStatus } from "../../../api/openapi/models/JobStatus.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import LinearProgressWithLabel from "../../../components/LinearProgressWithLabel.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";

function StatusStep() {
  // global state
  const classifierJobId = useAppSelector((state) => state.dialog.classifierJobId);
  const dispatch = useAppDispatch();

  // poll the job
  const classifierJob = ClassifierHooks.usePollClassifierJob(classifierJobId, undefined);

  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeClassifierDialog());
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (classifierJob.data && classifierJob.data.status === JobStatus.FINISHED && classifierJob.data.output) {
      dispatch(CRUDDialogActions.nextClassifierDialogStep());
    } else {
      console.error("Job is not finished yet.");
    }
  }, [classifierJob.data, dispatch]);

  const progressTooltip = useMemo(() => {
    if (!classifierJob.data) return "";
    return classifierJob.data.current_step === classifierJob.data.steps.length
      ? `Status: All ${classifierJob.data?.steps.length} steps are done.`
      : `Status: ${classifierJob.data?.current_step} of ${classifierJob.data?.steps.length} steps are done.`;
  }, [classifierJob.data]);

  const isNextDisabled = useMemo(
    () => !classifierJob.data || classifierJob.data.status !== JobStatus.FINISHED || !classifierJob.data.output,
    [classifierJob.data],
  );

  return (
    <>
      <DialogContent>
        <Stack gap={2}>
          <LinearProgressWithLabel
            sx={{ ml: 5 }}
            variant={classifierJob.isSuccess ? "determinate" : "indeterminate"}
            current={classifierJob.isSuccess ? classifierJob.data.current_step : 0}
            max={classifierJob.isSuccess ? classifierJob.data.steps.length : 0}
            tooltip={progressTooltip}
          />
          {classifierJob.isSuccess && (
            <>
              <Typography variant="caption" color="textSecondary" textAlign="center" mt={-3}>
                Status: {classifierJob.data.status} - {classifierJob.data.status_message}
              </Typography>
              {classifierJob.data.status === JobStatus.FINISHED ? (
                <Typography>
                  I am done with {classifierJob.data.input.model_type.toLowerCase()}{" "}
                  {classifierJob.data.input.task_type.toLowerCase()}. You can view the results now!
                </Typography>
              ) : classifierJob.data.status === JobStatus.FAILED ? (
                <Typography>An error occurred! I am very sorry. You can close this dialog now...</Typography>
              ) : null}
            </>
          )}
          <Typography mt={4} fontSize="0.9em" color="textSecondary">
            This may take a while. You can close the dialog and come back later. You can find all classifier jobs in the
            classifier view.
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
