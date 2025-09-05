import { Alert, Button, DialogActions, DialogContent, Divider, Stack, Typography } from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import ClassifierHooks from "../../../../api/ClassifierHooks.ts";
import { JobStatus } from "../../../../api/openapi/models/JobStatus.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import ClassifierJobProgressBar from "../../ClassifierJobProgressBar.tsx";

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

  const isNextDisabled = useMemo(
    () => !classifierJob.data || classifierJob.data.status !== JobStatus.FINISHED || !classifierJob.data.output,
    [classifierJob.data],
  );

  return (
    <>
      <DialogContent sx={{ backgroundColor: "grey.100" }}>
        <Stack gap={2}>
          <ClassifierJobProgressBar classifierJob={classifierJob.data} />
          {classifierJob.isSuccess && (
            <>
              {classifierJob.data.status === JobStatus.FINISHED ? (
                <Alert severity="success" sx={{ border: "1px solid", borderColor: "success.main" }}>
                  Classifier task '{classifierJob.data.input.model_type.toLowerCase()} classifier{" "}
                  {classifierJob.data.input.task_type.toLowerCase()}' finished successfully! You can view the results in
                  the next step.
                </Alert>
              ) : classifierJob.data.status === JobStatus.FAILED ? (
                <Alert severity="error" sx={{ border: "1px solid", borderColor: "error.main" }}>
                  An error occurred! Please try again or contact the maintainers if the issue persists.
                </Alert>
              ) : (
                <Typography mt={4} fontSize="0.9em" color="textSecondary">
                  This may take a while. You can close the dialog and come back later. You can find all classifier jobs
                  in the classifier view.
                </Typography>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <Divider />
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
