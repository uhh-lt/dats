import { Button, List, ListSubheader } from "@mui/material";
import LLMHooks from "../../../api/LLMHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { LLMJobRead } from "../../../api/openapi/models/LLMJobRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import BackgroundJobListItem from "./BackgroundJobListItem.tsx";
import LLMJobDetailListItem from "./LLMJobDetailListItem.tsx";

interface LLMJobListItemProps {
  initialLLMJob: LLMJobRead;
}

function LLMJobListItem({ initialLLMJob }: LLMJobListItemProps) {
  // global server state (react-query)
  const llmJob = LLMHooks.usePollLLMJob(initialLLMJob.id, initialLLMJob);

  // compute date sting
  const createdDate = dateToLocaleString(llmJob.data!.created);
  const updatedDate = dateToLocaleString(llmJob.data!.updated);
  let subTitle = `${
    llmJob.data!.parameters.specific_llm_job_parameters.sdoc_ids.length
  } documents, started at ${createdDate}`;
  if (llmJob.data!.status === BackgroundJobStatus.FINISHED) {
    subTitle += `, finished at ${updatedDate}`;
  } else if (llmJob.data!.status === BackgroundJobStatus.ABORTED) {
    subTitle += `, aborted at ${updatedDate}`;
  } else if (llmJob.data!.status === BackgroundJobStatus.ERRORNEOUS) {
    subTitle += `, failed at ${updatedDate}`;
  }

  // actions
  const dispatch = useAppDispatch();
  const handleViewResults = () => {
    dispatch(CRUDDialogActions.closeProjectSettings());
    dispatch(
      CRUDDialogActions.resumeLLMDialog({
        jobId: initialLLMJob.id,
      }),
    );
  };

  if (llmJob.isSuccess) {
    return (
      <BackgroundJobListItem
        jobStatus={llmJob.data.status}
        jobId={llmJob.data.id}
        title={`LLM Job: ${llmJob.data.id}`}
        subTitle={subTitle}
      >
        <List
          component="div"
          subheader={<ListSubheader>Task: {llmJob.data.parameters.llm_job_type}</ListSubheader>}
          disablePadding
          dense
          sx={{ pl: 8 }}
        >
          <LLMJobDetailListItem detailKey="System Prompt" detailValue={llmJob.data.parameters.system_prompt} />
          <LLMJobDetailListItem detailKey="User Prompt" detailValue={llmJob.data.parameters.user_prompt} />
          {llmJob.data.status === BackgroundJobStatus.FINISHED ? (
            <Button sx={{ width: "fit-content" }} onClick={handleViewResults}>
              View results
            </Button>
          ) : llmJob.data.status === BackgroundJobStatus.RUNNING ? (
            <Button sx={{ width: "fit-content" }} onClick={handleViewResults}>
              View progress
            </Button>
          ) : null}
        </List>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

export default LLMJobListItem;
