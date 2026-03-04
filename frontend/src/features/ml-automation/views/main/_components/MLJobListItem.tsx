import { JobHooks } from "@api/hooks/JobHooks";
import { JobStatus } from "@api/models/JobStatus";
import { MlJobRead } from "@api/models/MlJobRead";
import { JobListItem } from "@core/job";
import { Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { memo, useMemo } from "react";

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
