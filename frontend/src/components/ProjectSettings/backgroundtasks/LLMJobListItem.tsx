import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, Stack, Tab, TextField } from "@mui/material";
import { useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import { ApproachType } from "../../../api/openapi/models/ApproachType.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { FewShotParams } from "../../../api/openapi/models/FewShotParams.ts";
import { LLMJobRead } from "../../../api/openapi/models/LLMJobRead.ts";
import { LLMPromptTemplates } from "../../../api/openapi/models/LLMPromptTemplates.ts";
import { ModelTrainingParams } from "../../../api/openapi/models/ModelTrainingParams.ts";
import { ZeroShotParams } from "../../../api/openapi/models/ZeroShotParams.ts";
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
    llmJob.data!.parameters.specific_task_parameters.sdoc_ids.length
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
    if (!llmJob.data) return;

    dispatch(CRUDDialogActions.closeProjectSettings());
    dispatch(CRUDDialogActions.llmDialogOpenFromBackgroundTask(llmJob.data));
  };

  if (llmJob.isSuccess) {
    return (
      <BackgroundJobListItem
        jobStatus={llmJob.data.status}
        jobId={llmJob.data.id}
        title={`LLM Job - ${llmJob.data.parameters.llm_job_type} - ${llmJob.data.parameters.llm_approach_type}`}
        subTitle={subTitle}
      >
        <Stack sx={{ px: 9 }}>
          {llmJob.data.status === BackgroundJobStatus.FINISHED ? (
            <Button variant="contained" sx={{ width: "fit-content" }} onClick={handleViewResults}>
              View {llmJob.data.parameters.llm_job_type} results
            </Button>
          ) : llmJob.data.status === BackgroundJobStatus.RUNNING ? (
            <Button variant="contained" sx={{ width: "fit-content" }} onClick={handleViewResults}>
              View {llmJob.data.parameters.llm_job_type} progress
            </Button>
          ) : null}
          <LLMJobDetailViewer llmJob={llmJob.data} />
        </Stack>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

function LLMJobDetailViewer({ llmJob }: { llmJob: LLMJobRead }) {
  switch (llmJob.parameters.llm_approach_type) {
    case ApproachType.LLM_ZERO_SHOT:
      return <PromptViewer prompts={(llmJob.parameters.specific_approach_parameters as ZeroShotParams).prompts} />;
    case ApproachType.LLM_FEW_SHOT:
      return <PromptViewer prompts={(llmJob.parameters.specific_approach_parameters as FewShotParams).prompts} />;
    case ApproachType.MODEL_TRAINING:
      return (
        <TrainingParameterViewer parameters={llmJob.parameters.specific_approach_parameters as ModelTrainingParams} />
      );
    default:
      <>Approach is not supported!</>;
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

function TrainingParameterViewer({ parameters }: { parameters: ModelTrainingParams }) {
  return (
    <Stack gap={2} mt={2}>
      {Object.entries(parameters.training_parameters).map(([key, value]) => (
        <TextField key={key} fullWidth label={key} value={value} type="number" inputProps={{ readOnly: true }} />
      ))}
    </Stack>
  );
}

export default LLMJobListItem;
