import { JobListItem, useLiveJob } from "@core/job";
import { ImportJobRead } from "@models/ImportJobRead";
import { JobStatus } from "@models/JobStatus";
import { Typography } from "@mui/material";
import { formatDateTime } from "@utils/DateUtils";
import { memo, useMemo } from "react";
import { importQueries } from "../../../../../api/importQueries";

interface ImportJobListItemProps {
  initialImportJob: ImportJobRead;
}

export const ImportJobListItem = memo(({ initialImportJob }: ImportJobListItemProps) => {
  // global server state (react-query)
  const importJob = useLiveJob(importQueries.job.byId(initialImportJob.job_id), initialImportJob);

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!importJob.data) {
      return "";
    }
    const createdDate = formatDateTime(importJob.data.created);
    let title = `${importJob.data.input.import_job_type}, started at ${createdDate}`;
    if (importJob.data.status === JobStatus.FINISHED && importJob.data.finished) {
      const finishedDate = formatDateTime(importJob.data.finished);
      title += `, finished at ${finishedDate}`;
    }
    return title;
  }, [importJob.data]);

  if (importJob.isSuccess) {
    return (
      <JobListItem
        jobStatus={importJob.data.status}
        jobId={importJob.data.job_id}
        title={`Import Job - ${importJob.data.input.import_job_type}`}
        subTitle={subTitle}
      >
        <Typography>{importJob.data.status_message}</Typography>
      </JobListItem>
    );
  } else {
    return null;
  }
});
