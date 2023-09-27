import { List, ListSubheader } from "@mui/material";
import React from "react";
import { BackgroundJobStatus, PreprocessingJobRead } from "../../../../api/openapi";
import PreProHooks from "../../../../api/PreProHooks";
import BackgroundJobListItem from "./BackgroundJobListItem";
import PreProJobPayloadListItem from "./PreProJobPayloadListItem";
import { ProjectDocumentsContextMenuHandle } from "../ProjectDocumentsContextMenu";

interface PreprocessingJobListItemProps {
  initialPreProJob: PreprocessingJobRead;
  contextMenuRef: React.RefObject<ProjectDocumentsContextMenuHandle>
}

function PreProJobListItem({ initialPreProJob, contextMenuRef }: PreprocessingJobListItemProps) {
  // global server state (react-query)
  const preProJob = PreProHooks.usePollPreProJob(initialPreProJob.id, initialPreProJob);

  // local state
  const createdDate = new Date(initialPreProJob.created);
  const updatedDate = new Date(initialPreProJob.updated);

  let subTitle = `${preProJob.data!.payloads.length} documents, started at ${createdDate.toLocaleTimeString()}, ${createdDate.toDateString()}`
  if (preProJob.data!.status === BackgroundJobStatus.FINISHED) {
    subTitle += `, finished at ${updatedDate.toLocaleTimeString()}, ${updatedDate.toDateString()}`
  } else if (preProJob.data!.status === BackgroundJobStatus.ABBORTED) {
    subTitle += `, aborted at ${updatedDate.toLocaleTimeString()}, ${updatedDate.toDateString()}`
  } else if (preProJob.data!.status === BackgroundJobStatus.ERRORNEOUS) {
    subTitle += `, failed at ${updatedDate.toLocaleTimeString()}, ${updatedDate.toDateString()}`
  }

  if (preProJob.isSuccess) {
    return (
      <BackgroundJobListItem
        jobStatus={preProJob.data.status}
        jobId={preProJob.data.id}
        abortable={true}
        title={`Preprocessing Job: ${preProJob.data.id}`}
        subTitle={subTitle}
      >
        <List component="div"
        subheader={
          <ListSubheader sx={{ pl: 8 }}>
            Processed Documents
          </ListSubheader>
        }
        disablePadding
        dense>
          {preProJob.data.payloads.map((ppj, index) => (
            <PreProJobPayloadListItem key={index} ppj={ppj} contextMenuRef={contextMenuRef} />
          ))}
        </List>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

export default PreProJobListItem;
