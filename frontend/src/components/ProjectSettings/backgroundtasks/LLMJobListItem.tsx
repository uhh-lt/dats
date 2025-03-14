import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tab, TextField } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import LLMHooks from "../../../api/LLMHooks.ts";
import { ApproachType } from "../../../api/openapi/models/ApproachType.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { FewShotParams } from "../../../api/openapi/models/FewShotParams.ts";
import { LLMJobRead } from "../../../api/openapi/models/LLMJobRead.ts";
import { LLMJobResult } from "../../../api/openapi/models/LLMJobResult.ts";
import { LLMPromptTemplates } from "../../../api/openapi/models/LLMPromptTemplates.ts";
import { ModelTrainingParams } from "../../../api/openapi/models/ModelTrainingParams.ts";
import { ZeroShotParams } from "../../../api/openapi/models/ZeroShotParams.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import { docTypeToIcon } from "../../../utils/icons/docTypeToIcon.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import BackgroundJobListItem from "./BackgroundJobListItem.tsx";
import { statusToTypographyColor } from "./StatusToTypographyColor.ts";

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

  // tabs
  // tab state
  const [tab, setTab] = useState("Status");
  const handleChangeTab = (_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
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
          <TabContext value={tab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList onChange={handleChangeTab}>
                <Tab key={"Status"} label={"Status"} value={"Status"} />
                <Tab key={"Inputs"} label={"Inputs"} value={"Inputs"} />
                <div
                  style={{
                    flexGrow: 1,
                  }}
                />
                {llmJob.data.status === BackgroundJobStatus.FINISHED ? (
                  <Button variant="contained" onClick={handleViewResults} sx={{ m: 0.5 }}>
                    View {llmJob.data.parameters.llm_job_type} results
                  </Button>
                ) : llmJob.data.status === BackgroundJobStatus.RUNNING ? (
                  <Button variant="contained" onClick={handleViewResults} sx={{ m: 0.5 }}>
                    View {llmJob.data.parameters.llm_job_type} progress
                  </Button>
                ) : null}
              </TabList>
            </Box>
            <TabPanel key={"Inputs"} value={"Inputs"} sx={{ p: 0 }}>
              <InputViewer llmJob={llmJob.data} />
            </TabPanel>
            <TabPanel key={"Status"} value={"Status"} sx={{ p: 0 }}>
              {llmJob.data.result ? <StatusViewer llmJobResult={llmJob.data.result} /> : "No results available"}
            </TabPanel>
          </TabContext>
        </Stack>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

function InputViewer({ llmJob }: { llmJob: LLMJobRead }) {
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
            <Tab key={prompt.language} label={prompt.language + " Prompts"} value={prompt.language} />
          ))}
        </TabList>
      </Box>
      {prompts.map((prompt) => (
        <TabPanel key={prompt.language} value={prompt.language} sx={{ pl: 0, pr: 1, height: 352, overflowY: "auto" }}>
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

function StatusViewer({ llmJobResult }: { llmJobResult: LLMJobResult }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: llmJobResult.specific_task_result.results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
  });

  const items = virtualizer.getVirtualItems();
  return (
    <Box ref={parentRef} sx={{ overflowY: "auto", height: 400 }}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        <List
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${items[0]?.start ?? 0}px)`,
          }}
        >
          {items.map((item) => (
            <div key={item.key} data-index={item.index} ref={virtualizer.measureElement}>
              <LLMResultStatusItem result={llmJobResult.specific_task_result.results[item.index]} />
            </div>
          ))}
        </List>
      </div>
    </Box>
  );
}

interface ResultStatusItem {
  /**
   * Status of the Result
   */
  status: BackgroundJobStatus;
  /**
   * Status message of the result
   */
  status_message: string;
  /**
   * ID of the source document
   */
  sdoc_id: number;
}

function LLMResultStatusItem({ result }: { result: ResultStatusItem }) {
  return (
    <ListItemButton component={RouterLink} to={`./annotation/${result.sdoc_id}`}>
      <ListItemIcon sx={{ color: `${statusToTypographyColor[result.status]}` }}>
        {docTypeToIcon[DocType.TEXT]}
      </ListItemIcon>
      <ListItemText primary={`Document with ID ${result.sdoc_id} - ${result.status_message}`} />
    </ListItemButton>
  );
}

export default LLMJobListItem;
