import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tab, TextField } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import LLMHooks from "../../api/LLMHooks.ts";
import { ApproachType } from "../../api/openapi/models/ApproachType.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { FewShotParams } from "../../api/openapi/models/FewShotParams.ts";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { LlmAssistantJobRead } from "../../api/openapi/models/LlmAssistantJobRead.ts";
import { LLMJobOutput } from "../../api/openapi/models/LLMJobOutput.ts";
import { LLMPromptTemplates } from "../../api/openapi/models/LLMPromptTemplates.ts";
import { ZeroShotParams } from "../../api/openapi/models/ZeroShotParams.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { docTypeToIcon } from "../../utils/icons/docTypeToIcon.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import JobListItem from "./JobListItem.tsx";
import { jobStatusToTypographyColor } from "./StatusToTypographyColor.ts";

interface LLMJobListItemProps {
  initialLLMJob: LlmAssistantJobRead;
}

function LLMJobListItem({ initialLLMJob }: LLMJobListItemProps) {
  // global server state (react-query)
  const llmJob = LLMHooks.usePollLLMJob(initialLLMJob.job_id, initialLLMJob);

  // actions
  const dispatch = useAppDispatch();
  const handleViewResults = useCallback(() => {
    if (!llmJob.data) return;
    dispatch(CRUDDialogActions.closeProjectSettings());
    dispatch(CRUDDialogActions.llmDialogOpenFromBackgroundTask(llmJob.data));
  }, [dispatch, llmJob.data]);

  // tab state
  const [tab, setTab] = useState("Status");
  const handleChangeTab = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  }, []);

  if (llmJob.isSuccess) {
    return (
      <JobListItem
        jobStatus={llmJob.data.status}
        jobId={llmJob.data.job_id}
        title={`LLM Job - ${llmJob.data.input.llm_job_type} - ${llmJob.data.input.llm_approach_type}`}
        subTitle={`This job processes ${llmJob.data.input.specific_task_parameters.sdoc_ids.length} documents.`}
      >
        <Stack sx={{ px: 9 }}>
          <TabContext value={tab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList onChange={handleChangeTab}>
                <Tab key={"Status"} label={"Status"} value={"Status"} />
                <Tab key={"Inputs"} label={"Inputs"} value={"Inputs"} />
                <div style={{ flexGrow: 1 }} />
                {llmJob.data.status === JobStatus.FINISHED ? (
                  <Button variant="contained" onClick={handleViewResults} sx={{ m: 0.5 }}>
                    View {llmJob.data.input.llm_job_type} results
                  </Button>
                ) : llmJob.data.status === JobStatus.STARTED ? (
                  <Button variant="contained" onClick={handleViewResults} sx={{ m: 0.5 }}>
                    View {llmJob.data.input.llm_job_type} progress
                  </Button>
                ) : null}
              </TabList>
            </Box>
            <TabPanel key={"Inputs"} value={"Inputs"} sx={{ p: 0 }}>
              <InputViewer llmJob={llmJob.data} />
            </TabPanel>
            <TabPanel key={"Status"} value={"Status"} sx={{ p: 0 }}>
              {llmJob.data.output ? <StatusViewer llmJobResult={llmJob.data.output} /> : "No results available"}
            </TabPanel>
          </TabContext>
        </Stack>
      </JobListItem>
    );
  } else {
    return null;
  }
}

function InputViewer({ llmJob }: { llmJob: LlmAssistantJobRead }) {
  switch (llmJob.input.llm_approach_type) {
    case ApproachType.LLM_ZERO_SHOT:
      return <PromptViewer prompts={(llmJob.input.specific_approach_parameters as ZeroShotParams).prompts} />;
    case ApproachType.LLM_FEW_SHOT:
      return <PromptViewer prompts={(llmJob.input.specific_approach_parameters as FewShotParams).prompts} />;
    default:
      return <>Approach is not supported!</>;
  }
}

function PromptViewer({ prompts }: { prompts: LLMPromptTemplates[] }) {
  // tab state
  const [tab, setTab] = useState(prompts[0].language);
  const handleChangeTab = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  }, []);

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

function StatusViewer({ llmJobResult }: { llmJobResult: LLMJobOutput }) {
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
  status: string;
  status_message: string;
  sdoc_id: number;
}

function LLMResultStatusItem({ result }: { result: ResultStatusItem }) {
  return (
    <ListItemButton component={RouterLink} to={`./annotation/${result.sdoc_id}`}>
      <ListItemIcon
        sx={{
          color: `${
            result.status == "finished"
              ? jobStatusToTypographyColor[JobStatus.FINISHED]
              : jobStatusToTypographyColor[JobStatus.FAILED]
          }`,
        }}
      >
        {docTypeToIcon[DocType.TEXT]}
      </ListItemIcon>
      <ListItemText primary={`Document with ID ${result.sdoc_id} - ${result.status_message}`} />
    </ListItemButton>
  );
}

export default memo(LLMJobListItem);
