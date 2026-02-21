import { Typography } from "@mui/material";
import { memo, useMemo } from "react";
import { JobHooks } from "../../api/JobHooks.ts";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { MlJobRead } from "../../api/openapi/models/MlJobRead.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import { JobListItem } from "./JobListItem.tsx";

interface MLJobListItemProps {
  initialMLJob: MlJobRead;
}

export const MLJobListItem = memo(({ initialMLJob }: MLJobListItemProps) => {
  // global server state (react-query)
  const mlJob = JobHooks.usePollMLJob(initialMLJob.job_id, initialMLJob);

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!mlJob.data) {
      return "";
    }
    const createdDate = dateToLocaleString(mlJob.data.created);
    let title = `${mlJob.data.input.ml_job_type}, started at ${createdDate}`;
    if (mlJob.data.status === JobStatus.FINISHED && mlJob.data.finished) {
      const finishedDate = dateToLocaleString(mlJob.data.finished);
      title += `, finished at ${finishedDate}`;
    }
    return title;
  }, [mlJob.data]);

  if (mlJob.isSuccess) {
    return (
      <JobListItem
        jobStatus={mlJob.data.status}
        jobId={mlJob.data.job_id}
        title={`ML Job - ${mlJob.data.input.ml_job_type}`}
        subTitle={subTitle}
      >
        <Typography>{mlJob.data.status_message}</Typography>
      </JobListItem>
    );
  } else {
    return null;
  }
});
