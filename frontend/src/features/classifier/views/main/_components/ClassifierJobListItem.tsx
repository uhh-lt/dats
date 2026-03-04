import { ClassifierHooks } from "@api/hooks/ClassifierHooks";
import { ClassifierEvaluationOutput } from "@api/models/ClassifierEvaluationOutput";
import { ClassifierInferenceOutput } from "@api/models/ClassifierInferenceOutput";
import { ClassifierJobRead } from "@api/models/ClassifierJobRead";
import { ClassifierTask } from "@api/models/ClassifierTask";
import { ClassifierTrainingOutput } from "@api/models/ClassifierTrainingOutput";
import { JobStatus } from "@api/models/JobStatus";
import { JobListItem, jobStatusToSimple } from "@core/job";
import { Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { memo, useMemo } from "react";
import { ClassifierDetails } from "../../../_components/ClassifierDetails";
import { ClassifierJobProgressBar } from "../../../_components/ClassifierJobProgressBar";

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
