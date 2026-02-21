import { Typography } from "@mui/material";
import { memo, useMemo } from "react";
import { ImportHooks } from "../../api/ImportHooks";
import { ImportJobRead } from "../../api/openapi/models/ImportJobRead";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import { JobListItem } from "./JobListItem.tsx";

interface ImportJobListItemProps {
  initialImportJob: ImportJobRead;
}

export const ImportJobListItem = memo(({ initialImportJob }: ImportJobListItemProps) => {
  // global server state (react-query)
  const importJob = ImportHooks.usePollImportJob(initialImportJob.job_id, initialImportJob);

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!importJob.data) {
      return "";
    }
    const createdDate = dateToLocaleString(importJob.data.created);
    let title = `${importJob.data.input.import_job_type}, started at ${createdDate}`;
    if (importJob.data.status === JobStatus.FINISHED && importJob.data.finished) {
      const finishedDate = dateToLocaleString(importJob.data.finished);
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
