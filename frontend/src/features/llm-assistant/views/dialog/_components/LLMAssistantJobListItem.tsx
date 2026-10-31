import { JobListItem, jobStatusToTypographyColor, useLiveJob } from "@core/job";
import { SdocRenderer } from "@core/source-document";
import { JobStatus } from "@models/JobStatus";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { LLMAssistantJobOutput } from "@models/LLMAssistantJobOutput";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tab,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDateTime } from "@utils/DateUtils";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { llmAssistantQueries } from "../../../api/llmAssistantQueries";
import { LANGUAGE_LABELS, PromptHooks } from "@core/prompt";
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
    const count = llmAssistantJob.data.input.sdoc_ids.length;
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
        title={`LLM Assistant Job - ${llmAssistantJob.data.input.task_type}${llmAssistantJob.data.output ? ` - ${llmAssistantJob.data.output.approach_type}` : ""}`}
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
  const { draft, prompt_version_id: versionId, model } = llmAssistantJob.input;
  const promptVersion = PromptHooks.useGetPromptVersion({
    projectId: llmAssistantJob.project_id,
    versionId: versionId ?? undefined,
  });

  // a run of the wizard stores its prompt in the job
  if (draft) {
    return (
      <Stack gap={3} sx={{ pt: 1, pr: 1, height: 400, overflowY: "auto" }}>
        <Typography variant="subtitle2">
          Prompt of the wizard ({LANGUAGE_LABELS[draft.language]}), model {model}
        </Typography>
        <TextField
          fullWidth
          label="Prompt"
          value={draft.text}
          multiline
          slotProps={{ htmlInput: { readOnly: true, style: { fontFamily: "monospace" } } }}
        />
      </Stack>
    );
  }
  if (promptVersion.isLoading) return <CircularProgress />;
  if (!promptVersion.data) return <>The prompt version {versionId} does not exist.</>;
  const { prompt, version } = promptVersion.data;
  return (
    <Stack gap={3} sx={{ pt: 1, pr: 1, height: 400, overflowY: "auto" }}>
      <Typography variant="subtitle2">
        Prompt {prompt.name} ({LANGUAGE_LABELS[prompt.language]}), version {version.version}
        {prompt.is_archived ? " (archived)" : ""}, model {model}
      </Typography>
      <TextField
        fullWidth
        label="Prompt"
        value={version.text}
        multiline
        slotProps={{ htmlInput: { readOnly: true, style: { fontFamily: "monospace" } } }}
      />
    </Stack>
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
