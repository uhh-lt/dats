import { Typography } from "@mui/material";
import { memo, useMemo } from "react";
import ImportHooks from "../../api/ImportHooks";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus";
import { ImportJobRead } from "../../api/openapi/models/ImportJobRead";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import BackgroundJobListItem from "./BackgroundJobListItem.tsx";

interface ImportJobListItemProps {
  initialImportJob: ImportJobRead;
}

function ImportJobListItem({ initialImportJob }: ImportJobListItemProps) {
  // global server state (react-query)
  const importJob = ImportHooks.usePollImportJob(initialImportJob.id, initialImportJob);

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!importJob.data) {
      return "";
    }
    const createdDate = dateToLocaleString(importJob.data.created);
    const updatedDate = dateToLocaleString(importJob.data.updated);
    let title = `${importJob.data!.parameters.import_job_type}, started at ${createdDate}`;
    if (importJob.data!.status === BackgroundJobStatus.FINISHED) {
      title += `, finished at ${updatedDate}`;
    } else if (importJob.data!.status === BackgroundJobStatus.ABORTED) {
      title += `, aborted at ${updatedDate}`;
    } else if (importJob.data!.status === BackgroundJobStatus.ERRORNEOUS) {
      title += `, failed at ${updatedDate}`;
    }
    return title;
  }, [importJob.data]);

  if (importJob.isSuccess) {
    return (
      <BackgroundJobListItem
        jobStatus={importJob.data.status}
        jobId={importJob.data.id}
        title={`Import Job - ${importJob.data.parameters.import_job_type}}`}
        subTitle={subTitle}
      >
        <Typography>{importJob.data.error}</Typography>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

export default memo(ImportJobListItem);
