import { Typography } from "@mui/material";
import { memo, useMemo } from "react";
import { ClassifierHooks } from "../../api/ClassifierHooks.ts";
import { ClassifierEvaluationOutput } from "../../api/openapi/models/ClassifierEvaluationOutput.ts";
import { ClassifierInferenceOutput } from "../../api/openapi/models/ClassifierInferenceOutput.ts";
import { ClassifierJobRead } from "../../api/openapi/models/ClassifierJobRead.ts";
import { ClassifierTask } from "../../api/openapi/models/ClassifierTask.ts";
import { ClassifierTrainingOutput } from "../../api/openapi/models/ClassifierTrainingOutput.ts";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import { ClassifierDetails } from "../Classifier/ClassifierDetails.tsx";
import { ClassifierJobProgressBar } from "../Classifier/ClassifierJobProgressBar.tsx";
import { JobListItem } from "./JobListItem.tsx";
import { jobStatusToSimple } from "./StatusToSimple.ts";

interface ClassifierJobListItemProps {
  initialClassifierJob: ClassifierJobRead;
}

export const ClassifierJobListItem = memo(({ initialClassifierJob }: ClassifierJobListItemProps) => {
  // global server state (react-query)
  const cj = ClassifierHooks.usePollClassifierJob(initialClassifierJob.job_id, initialClassifierJob);

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!cj.data) {
      return "";
    }
    const createdDate = dateToLocaleString(cj.data.created);
    let title = `${cj.data.input.model_type} - ${cj.data.input.task_type}, started at ${createdDate}`;
    if (cj.data.status === JobStatus.FINISHED && cj.data.finished) {
      const finishedDate = dateToLocaleString(cj.data.finished);
      title += `, finished at ${finishedDate}`;
    }
    return title;
  }, [cj.data]);

  if (cj.isSuccess) {
    const simpleJobStatus = jobStatusToSimple[cj.data.status];
    return (
      <JobListItem
        jobStatus={cj.data.status}
        jobId={cj.data.job_id}
        title={`${cj.data.input.model_type} - ${cj.data.input.task_type}`}
        subTitle={subTitle}
      >
        {simpleJobStatus === "finished" && cj.data.output ? (
          <>
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
          </>
        ) : simpleJobStatus === "running" ? (
          <ClassifierJobProgressBar classifierJob={cj.data} />
        ) : simpleJobStatus === "error" ? (
          <Typography>{cj.data.status_message}</Typography>
        ) : null}
      </JobListItem>
    );
  } else {
    return null;
  }
});
