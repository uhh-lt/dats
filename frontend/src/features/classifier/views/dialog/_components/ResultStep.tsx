import { ClassifierHooks } from "@api/hooks/ClassifierHooks";
import { ClassifierEvaluationOutput } from "@api/models/ClassifierEvaluationOutput";
import { ClassifierInferenceOutput } from "@api/models/ClassifierInferenceOutput";
import { ClassifierTask } from "@api/models/ClassifierTask";
import { ClassifierTrainingOutput } from "@api/models/ClassifierTrainingOutput";
import { Button, DialogActions, DialogContent, Divider } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { ClassifierDetails } from "../../../_components/ClassifierDetails";
import { ClassifierActions } from "../../../store/classifierSlice";

export function ResultStep() {
  // global client state
  const classifierJobId = useAppSelector((state) => state.classifier.classifierJobId);
  const dispatch = useAppDispatch();

  // get the job
  const cj = ClassifierHooks.usePollClassifierJob(classifierJobId, undefined);

  // dialog actions
  const handleClose = useCallback(() => {
    dispatch(ClassifierActions.closeClassifierDialog());
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
