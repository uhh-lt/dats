import { Typography } from "@mui/material";
import { memo, useMemo } from "react";
import ClassifierHooks from "../../api/ClassifierHooks.ts";
import { ClassifierJobRead } from "../../api/openapi/models/ClassifierJobRead.ts";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import JobListItem from "./JobListItem.tsx";

interface ClassifierJobListItemProps {
  initialClassifierJob: ClassifierJobRead;
}

function ClassifierJobListItem({ initialClassifierJob }: ClassifierJobListItemProps) {
  // global server state (react-query)
  const classifierJob = ClassifierHooks.usePollClassifierJob(initialClassifierJob.job_id, initialClassifierJob);

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!classifierJob.data) {
      return "";
    }
    const createdDate = dateToLocaleString(classifierJob.data.created);
    let title = `${classifierJob.data.input.model_type} - ${classifierJob.data.input.task_type}, started at ${createdDate}`;
    if (classifierJob.data.status === JobStatus.FINISHED && classifierJob.data.finished) {
      const finishedDate = dateToLocaleString(classifierJob.data.finished);
      title += `, finished at ${finishedDate}`;
    }
    return title;
  }, [classifierJob.data]);

  if (classifierJob.isSuccess) {
    return (
      <JobListItem
        jobStatus={classifierJob.data.status}
        jobId={classifierJob.data.job_id}
        title={`${classifierJob.data.input.model_type} - ${classifierJob.data.input.task_type}`}
        subTitle={subTitle}
      >
        <Typography>{classifierJob.data.status_message}</Typography>
      </JobListItem>
    );
  } else {
    return null;
  }
}

export default memo(ClassifierJobListItem);
