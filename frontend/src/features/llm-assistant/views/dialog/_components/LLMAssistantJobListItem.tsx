import { JobListItem, jobStatusToTypographyColor, useLiveJob } from "@core/job";
import { SdocRenderer } from "@core/source-document";
import { ApproachType } from "@models/ApproachType";
import { FewShotParams } from "@models/FewShotParams";
import { JobStatus } from "@models/JobStatus";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { LLMAssistantJobOutput } from "@models/LLMAssistantJobOutput";
import { LLMAssistantPromptTemplates } from "@models/LLMAssistantPromptTemplates";
import { ZeroShotParams } from "@models/ZeroShotParams";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, List, ListItem, ListItemIcon, ListItemText, Stack, Tab, TextField } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDateTime } from "@utils/DateUtils";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { llmAssistantQueries } from "../../../api/llmAssistantQueries";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";

interface LLMAssistantJobListItemProps {
  initialLLMAssistantJob: LlmAssistantJobRead;
}

export const LLMAssistantJobListItem = memo(({ initialLLMAssistantJob }: LLMAssistantJobListItemProps) => {
  // global server state (react-query)
  const llmAssistantJob = useLiveJob(
    llmAssistantQueries.job.byId(initialLLMAssistantJob.job_id),
    initialLLMAssistantJob,
  );

  // actions
  const dispatch = useAppDispatch();
  const handleViewResults = useCallback(() => {
    if (!llmAssistantJob.data) return;
    dispatch(LLMAssistantActions.openDialogFromBackgroundTask(llmAssistantJob.data));
  }, [dispatch, llmAssistantJob.data]);

  // compute subtitle
  const subTitle = useMemo(() => {
    if (!llmAssistantJob.data) return "";
    const count = llmAssistantJob.data.input.specific_task_parameters.sdoc_ids.length;
    const createdDate = formatDateTime(llmAssistantJob.data.created);
    let title = `Processes ${count} document${count !== 1 ? "s" : ""}, started at ${createdDate}`;
    if (llmAssistantJob.data.status === JobStatus.FINISHED && llmAssistantJob.data.finished) {
      title += `, finished at ${formatDateTime(llmAssistantJob.data.finished)}`;
    }
    return title;
  }, [llmAssistantJob.data]);

  // tab state
  const [tab, setTab] = useState("Status");
  const handleChangeTab = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  }, []);

  if (llmAssistantJob.isSuccess) {
    return (
      <JobListItem
        jobStatus={llmAssistantJob.data.status}
        jobId={llmAssistantJob.data.job_id}
        title={`LLM Assistant Job - ${llmAssistantJob.data.input.task_type} - ${llmAssistantJob.data.input.approach_type}`}
        subTitle={subTitle}
      >
        <Stack sx={{ px: 9 }}>
          <TabContext value={tab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList onChange={handleChangeTab}>
                <Tab key={"Status"} label={"Status"} value={"Status"} />
                <Tab key={"Inputs"} label={"Inputs"} value={"Inputs"} />
                <div style={{ flexGrow: 1 }} />
                {llmAssistantJob.data.status === JobStatus.FINISHED ? (
                  <Button variant="contained" onClick={handleViewResults} sx={{ m: 0.5 }}>
                    View {llmAssistantJob.data.input.task_type} results
                  </Button>
                ) : llmAssistantJob.data.status === JobStatus.STARTED ? (
                  <Button variant="contained" onClick={handleViewResults} sx={{ m: 0.5 }}>
                    View {llmAssistantJob.data.input.task_type} progress
                  </Button>
                ) : null}
              </TabList>
            </Box>
            <TabPanel key={"Inputs"} value={"Inputs"} sx={{ p: 0 }}>
              <InputViewer llmAssistantJob={llmAssistantJob.data} />
            </TabPanel>
            <TabPanel key={"Status"} value={"Status"} sx={{ p: 0 }}>
              {llmAssistantJob.data.output ? (
                <StatusViewer jobResult={llmAssistantJob.data.output} projectId={llmAssistantJob.data.project_id} />
              ) : (
                "No results available"
              )}
            </TabPanel>
          </TabContext>
        </Stack>
      </JobListItem>
    );
  } else {
    return null;
  }
});

function InputViewer({ llmAssistantJob }: { llmAssistantJob: LlmAssistantJobRead }) {
  switch (llmAssistantJob.input.approach_type) {
    case ApproachType.LLM_ZERO_SHOT:
      return <PromptViewer prompts={(llmAssistantJob.input.specific_approach_parameters as ZeroShotParams).prompts} />;
    case ApproachType.LLM_FEW_SHOT:
      return <PromptViewer prompts={(llmAssistantJob.input.specific_approach_parameters as FewShotParams).prompts} />;
    default:
      return <>Approach is not supported!</>;
  }
}

function PromptViewer({ prompts }: { prompts: LLMAssistantPromptTemplates[] }) {
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

function StatusViewer({ jobResult, projectId }: { jobResult: LLMAssistantJobOutput; projectId: number }) {
  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: jobResult.specific_task_result.results.length,
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
              <LLMAssistantResultStatusItem
                result={jobResult.specific_task_result.results[item.index]}
                projectId={projectId}
              />
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

function LLMAssistantResultStatusItem({ result }: { result: ResultStatusItem; projectId: number }) {
  const statusColor =
    result.status === "finished"
      ? jobStatusToTypographyColor[JobStatus.FINISHED]
      : jobStatusToTypographyColor[JobStatus.FAILED];

  return (
    <ListItem sx={{ px: 0 }}>
      <ListItemIcon sx={{ color: statusColor }}>
        <SdocRenderer sdoc={result.sdoc_id} renderDoctypeIcon />
      </ListItemIcon>
      <ListItemText
        primary={<SdocRenderer sdoc={result.sdoc_id} link renderName />}
        secondary={result.status_message}
      />
    </ListItem>
  );
}
