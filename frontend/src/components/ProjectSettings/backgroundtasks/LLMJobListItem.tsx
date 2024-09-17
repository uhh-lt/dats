import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, Stack, Tab, TextField } from "@mui/material";
import { useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { LLMJobRead } from "../../../api/openapi/models/LLMJobRead.ts";
import { LLMPromptTemplates } from "../../../api/openapi/models/LLMPromptTemplates.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import BackgroundJobListItem from "./BackgroundJobListItem.tsx";

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
        <Stack sx={{ pl: 8 }}>
          {llmJob.data.status === BackgroundJobStatus.FINISHED ? (
            <Button variant="contained" sx={{ width: "fit-content" }} onClick={handleViewResults}>
              View {llmJob.data.parameters.llm_job_type} results
            </Button>
          ) : llmJob.data.status === BackgroundJobStatus.RUNNING ? (
            <Button variant="contained" sx={{ width: "fit-content" }} onClick={handleViewResults}>
              View {llmJob.data.parameters.llm_job_type} progress
            </Button>
          ) : null}
          <PromptViewer prompts={llmJob.data.parameters.prompts} />
        </Stack>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

function PromptViewer({ prompts }: { prompts: LLMPromptTemplates[] }) {
  // tab state
  const [tab, setTab] = useState(prompts[0].language);
  const handleChangeTab = (_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  return (
    <TabContext value={tab}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <TabList onChange={handleChangeTab}>
          {prompts.map((prompt) => (
            <Tab key={prompt.language} label={prompt.language} value={prompt.language} />
          ))}
        </TabList>
      </Box>
      {prompts.map((prompt) => (
        <TabPanel key={prompt.language} value={prompt.language} sx={{ px: 0 }}>
          <Stack gap={3}>
            <TextField
              fullWidth
              label="System Prompt"
              value={prompt.system_prompt}
              type="text"
              multiline
              inputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              label="User Prompt"
              value={prompt.user_prompt}
              type="text"
              multiline
              inputProps={{ readOnly: true }}
            />
          </Stack>
        </TabPanel>
      ))}
    </TabContext>
  );
}

export default LLMJobListItem;
