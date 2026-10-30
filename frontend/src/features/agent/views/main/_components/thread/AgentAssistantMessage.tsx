import { ActionBarPrimitive, AuiIf, ErrorPrimitive, groupPartByType, MessagePrimitive } from "@assistant-ui/react";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, Box, Button, Stack } from "@mui/material";
import { AgentBranchPicker } from "./AgentBranchPicker";
import { AgentIconButton } from "./AgentIconButton";
import { AgentMarkdownText } from "./AgentMarkdownText";
import { AgentReasoning } from "./AgentReasoning";
import { AgentToolCall } from "./AgentToolCall";
import { AgentToolGroup } from "./AgentToolGroup";
import { ShimmerText } from "./ShimmerText";

// adjacent reasoning parts form one reasoning panel, adjacent tool calls one tool group
const groupBy = groupPartByType({
  reasoning: ["group-reasoning"],
  "tool-call": ["group-tool"],
});

function AgentActionBar() {
  return (
    <ActionBarPrimitive.Root hideWhenRunning autohide="not-last">
      <Stack direction="row" color="text.secondary">
        <ActionBarPrimitive.Copy render={<AgentIconButton tooltip="Copy" />}>
          <AuiIf condition={(state) => state.message.isCopied}>
            <CheckIcon fontSize="small" />
          </AuiIf>
          <AuiIf condition={(state) => !state.message.isCopied}>
            <ContentCopyIcon fontSize="small" />
          </AuiIf>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload render={<AgentIconButton tooltip="Regenerate" />}>
          <RefreshIcon fontSize="small" />
        </ActionBarPrimitive.Reload>
        <ActionBarPrimitive.ExportMarkdown render={<AgentIconButton tooltip="Download as Markdown" />}>
          <DownloadOutlinedIcon fontSize="small" />
        </ActionBarPrimitive.ExportMarkdown>
      </Stack>
    </ActionBarPrimitive.Root>
  );
}

function AgentMessageError() {
  return (
    <MessagePrimitive.Error>
      <Alert
        severity="warning"
        sx={{ my: 1 }}
        action={
          <ActionBarPrimitive.Reload render={<Button color="inherit" size="small" />}>Retry</ActionBarPrimitive.Reload>
        }
      >
        <ErrorPrimitive.Root>
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </Alert>
    </MessagePrimitive.Error>
  );
}

/**
 * An answer of the agent: its reasoning, tool calls and text, an error with a
 * retry button if the run failed, and the actions (copy, regenerate, download).
 */
export function AgentAssistantMessage() {
  return (
    <MessagePrimitive.Root>
      <Box>
        <MessagePrimitive.GroupedParts groupBy={groupBy}>
          {({ part, children }) => {
            switch (part.type) {
              case "group-reasoning":
                return (
                  <AgentReasoning
                    isStreaming={part.status.type === "running"}
                    startedAt={part.timing?.startedAt}
                    completedAt={part.timing?.completedAt}
                  >
                    {children}
                  </AgentReasoning>
                );
              case "group-tool":
                if (part.indices.length === 1) return children;
                return (
                  <AgentToolGroup
                    count={part.indices.length}
                    isRunning={part.status.type === "running"}
                    needsApproval={part.counts.requiresAction > 0}
                  >
                    {children}
                  </AgentToolGroup>
                );
              case "text":
              case "reasoning":
                return <AgentMarkdownText />;
              case "tool-call":
                return <AgentToolCall {...part} />;
              case "indicator":
                return (
                  <ShimmerText variant="body2" sx={{ my: 1 }} role="status">
                    Working…
                  </ShimmerText>
                );
              default:
                return <></>;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <AgentMessageError />
        <Stack direction="row" alignItems="center" sx={{ minHeight: 34 }}>
          <AgentBranchPicker />
          <AgentActionBar />
        </Stack>
      </Box>
    </MessagePrimitive.Root>
  );
}
