import { Button, DialogActions, DialogContent, Divider } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useCallback } from "react";
import { ClassifierHooks } from "../../../../../api/ClassifierHooks";
import { ClassifierEvaluationOutput } from "../../../../../api/openapi/models/ClassifierEvaluationOutput";
import { ClassifierInferenceOutput } from "../../../../../api/openapi/models/ClassifierInferenceOutput";
import { ClassifierTask } from "../../../../../api/openapi/models/ClassifierTask";
import { ClassifierTrainingOutput } from "../../../../../api/openapi/models/ClassifierTrainingOutput";
import { ClassifierDetails } from "../../../_components/ClassifierDetails";

export function ResultStep() {
  // global client state
  const classifierJobId = useAppSelector((state) => state.dialog.classifierJobId);
  const dispatch = useAppDispatch();

  // get the job
  const cj = ClassifierHooks.usePollClassifierJob(classifierJobId, undefined);

  // dialog actions
  const handleClose = useCallback(() => {
    dispatch(UIDialogActions.closeClassifierDialog());
  }, [dispatch]);

  if (!cj.data || !cj.data.output) return null;
  return (
    <>
      <DialogContent sx={{ backgroundColor: "grey.100" }}>
        {cj.data.input.task_type === ClassifierTask.EVALUATION ? (
          <ClassifierDetails.Evaluation
            classifierModel={cj.data.input.model_type}
            evaluation={(cj.data.output.task_output as ClassifierEvaluationOutput).evaluation}
          />
        ) : cj.data.input.task_type === ClassifierTask.INFERENCE ? (
          <ClassifierDetails.Inference
            classifierModel={cj.data.input.model_type}
            statistics={(cj.data.output.task_output as ClassifierInferenceOutput).result_statistics}
            affectedDocs={(cj.data.output.task_output as ClassifierInferenceOutput).total_affected_docs}
          />
        ) : cj.data.input.task_type === ClassifierTask.TRAINING ? (
          <ClassifierDetails classifier={(cj.data.output.task_output as ClassifierTrainingOutput).classifier} />
        ) : null}
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </>
  );
}
