import { List, ListSubheader } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useMemo, useRef } from "react";
import PreProHooks from "../../api/PreProHooks.ts";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { PreprocessingJobRead } from "../../api/openapi/models/PreprocessingJobRead.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import BackgroundJobListItem from "./BackgroundJobListItem.tsx";
import PreProJobPayloadListItem from "./PreProJobPayloadListItem.tsx";

interface PreprocessingJobListItemProps {
  initialPreProJob: PreprocessingJobRead;
}

function PreProJobListItem({ initialPreProJob }: PreprocessingJobListItemProps) {
  // global server state (react-query)
  const preProJob = PreProHooks.usePollPreProJob(initialPreProJob.id, initialPreProJob);

  const listRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: preProJob.data?.payloads.length || 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => 56, // estimated height of each item
  });

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!preProJob.data) {
      return "";
    }
    const createdDate = dateToLocaleString(initialPreProJob.created);
    const updatedDate = dateToLocaleString(initialPreProJob.updated);
    let title = `${preProJob.data.payloads.length} documents, started at ${createdDate}`;
    if (preProJob.data.status === BackgroundJobStatus.FINISHED) {
      title += `, finished at ${updatedDate}`;
    } else if (preProJob.data.status === BackgroundJobStatus.ABORTED) {
      title += `, aborted at ${updatedDate}`;
    } else if (preProJob.data.status === BackgroundJobStatus.ERRORNEOUS) {
      title += `, failed at ${updatedDate}`;
    }
    return title;
  }, [initialPreProJob.created, initialPreProJob.updated, preProJob.data]);

  if (preProJob.isSuccess) {
    return (
      <BackgroundJobListItem
        jobStatus={preProJob.data.status}
        jobId={preProJob.data.id}
        abortable={true}
        title={`Preprocessing Job: ${preProJob.data.id}`}
        subTitle={subTitle}
      >
        {/* <List
          component="div"
          subheader={<ListSubheader sx={{ pl: 8 }}>Processed Documents</ListSubheader>}
          disablePadding
          dense
        >
          {preProJob.data.payloads.map((ppj, index) => (
            <PreProJobPayloadListItem key={index} ppj={ppj} />
          ))}
        </List> */}
        <List
          ref={listRef}
          component="div"
          subheader={<ListSubheader sx={{ pl: 8 }}>Processed Documents</ListSubheader>}
          disablePadding
          dense
          style={{
            height: 400,
            overflow: "auto",
            position: "relative",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const ppj = preProJob.data?.payloads[virtualItem.index];
              return <PreProJobPayloadListItem key={virtualItem.key} ppj={ppj} />;
            })}
          </div>
        </List>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

export default memo(PreProJobListItem);
