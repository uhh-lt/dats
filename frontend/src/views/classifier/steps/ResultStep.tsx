import { Button, DialogActions, DialogContent } from "@mui/material";
import { useCallback } from "react";
import ClassifierHooks from "../../../api/ClassifierHooks.ts";
import { ClassifierEvaluationOutput } from "../../../api/openapi/models/ClassifierEvaluationOutput.ts";
import { ClassifierTask } from "../../../api/openapi/models/ClassifierTask.ts";
import { ClassifierTrainingOutput } from "../../../api/openapi/models/ClassifierTrainingOutput.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ClassifierDetails from "../ClassifierDetails.tsx";

function ResultStep() {
  // global client state
  const classifierJobId = useAppSelector((state) => state.dialog.classifierJobId);
  const dispatch = useAppDispatch();

  // get the job
  const cj = ClassifierHooks.usePollClassifierJob(classifierJobId, undefined);

  // dialog actions
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeClassifierDialog());
  }, [dispatch]);

  console.log(cj.data);
  if (!cj.data || !cj.data.output) return null;
  return (
    <>
      <DialogContent>
        <>
          {cj.data.input.task_type === ClassifierTask.EVALUATION ? (
            <ClassifierDetails.Evaluation
              classifierModel={cj.data.input.model_type}
              evaluation={(cj.data.output.task_output as ClassifierEvaluationOutput).evaluation}
            />
          ) : cj.data.input.task_type === ClassifierTask.INFERENCE ? (
            <>TODO</>
          ) : cj.data.input.task_type === ClassifierTask.TRAINING ? (
            <ClassifierDetails classifier={(cj.data.output.task_output as ClassifierTrainingOutput).classifier} />
          ) : null}
        </>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </>
  );
}

export default ResultStep;
