import { ToolCallMessagePartProps, useToolCallElapsed } from "@assistant-ui/react";
import BlockIcon from "@mui/icons-material/Block";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PanToolOutlinedIcon from "@mui/icons-material/PanToolOutlined";
import { Box, Button, ButtonBase, Chip, CircularProgress, Collapse, Paper, Stack, Typography } from "@mui/material";
import { memo, ReactNode, useState } from "react";
import { AgentHooks } from "../../../../api/agentHooks";
import { entityTypeOfTool, findReferencedEntities } from "../../_utils/datsLinkUtils";
import { useAgentThread } from "./agentThreadContext";
import { AgentEntityChip } from "./AgentEntityChip";
import { AgentToolArguments } from "./AgentToolArguments";
import { ShimmerText } from "./ShimmerText";

type AgentToolCallProps = Pick<
  ToolCallMessagePartProps,
  "toolCallId" | "toolName" | "argsText" | "result" | "isError" | "status"
>;

type ToolCallState = "running" | "approval" | "done" | "denied" | "cancelled" | "failed";

// the result pydantic-ai (ToolDenied) returns for a call the user denied
const DENIED_RESULT = "The tool call was denied.";

const toolCallState = ({ status, isError, result }: Pick<AgentToolCallProps, "status" | "isError" | "result">) => {
  if (status.type === "running") return "running";
  if (status.type === "requires-action") return "approval";
  if (status.type === "incomplete") return status.reason === "cancelled" ? "cancelled" : "failed";
  if (isError) return "failed";
  if (result === DENIED_RESULT) return "denied";
  return "done";
};

const STATE_ICONS: Record<ToolCallState, ReactNode> = {
  running: <CircularProgress size={14} />,
  approval: <PanToolOutlinedIcon fontSize="small" color="warning" />,
  done: <CheckCircleOutlineIcon fontSize="small" color="success" />,
  denied: <BlockIcon fontSize="small" color="disabled" />,
  cancelled: <CancelOutlinedIcon fontSize="small" color="disabled" />,
  failed: <ErrorOutlineIcon fontSize="small" color="error" />,
};

// prefix of the label for states other than running and done
const STATE_PREFIXES: Partial<Record<ToolCallState, string>> = {
  approval: "Needs your approval:",
  denied: "Denied:",
  cancelled: "Cancelled:",
  failed: "Failed:",
};

const formatDuration = (ms: number) => {
  if (ms < 1000) return "<1 s";
  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)} s`;
  if (seconds < 60) return `${Math.floor(seconds)} s`;
  return `${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)} s`;
};

// JSON (also JSON in a string) pretty-printed, anything else as it is
const formatValue = (value: unknown) => {
  if (typeof value !== "string") return JSON.stringify(value, null, 2);
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

function CodeBlock({ title, text }: { title: string; text: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{ m: 0, p: 1, bgcolor: "grey.100", borderRadius: 1, fontSize: 12, overflow: "auto", maxHeight: 240 }}
      >
        {text}
      </Box>
    </Box>
  );
}

const MAX_RESULT_ENTITIES = 12;

// the entities a result references (by id keys), parsed from the result's JSON
function ResultEntities({ toolName, result }: { toolName: string; result: unknown }) {
  let value = result;
  if (typeof result === "string") {
    try {
      value = JSON.parse(result);
    } catch {
      return null;
    }
  }
  const entities = findReferencedEntities(value, MAX_RESULT_ENTITIES, entityTypeOfTool(toolName));
  if (entities.length === 0) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Referenced
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {entities.map((entity) => (
          <AgentEntityChip key={`${entity.type}/${entity.id}`} type={entity.type} id={entity.id} />
        ))}
      </Box>
    </Box>
  );
}

function AgentToolApproval({ toolCallId, argsText }: Pick<AgentToolCallProps, "toolCallId" | "argsText">) {
  const { interrupts, decisions, decide } = useAgentThread();
  const interrupt = interrupts.find((candidate) => candidate.toolCallId === toolCallId);
  if (interrupt === undefined) return null;

  const decision = decisions[interrupt.id];
  return (
    <Paper variant="outlined" sx={{ mt: 0.5, mb: 1, ml: 3.5, p: 1.5, borderColor: "warning.main" }}>
      <Stack spacing={1}>
        <AgentToolArguments argsText={argsText} />
        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
          {decision !== undefined ? (
            <Chip
              size="small"
              label={decision ? "Approved, waiting for the other answers" : "Denied, waiting for the other answers"}
            />
          ) : (
            <>
              <Button size="small" onClick={() => decide([interrupt.id], false)}>
                Deny
              </Button>
              <Button size="small" variant="contained" color="error" onClick={() => decide([interrupt.id], true)}>
                Approve
              </Button>
            </>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

/**
 * A tool call of the agent (a DATS endpoint), described by its endpoint's
 * summary: its state and duration, the approval it waits for, and on click
 * its arguments, result and error.
 */
export const AgentToolCall = memo(({ toolCallId, toolName, argsText, result, isError, status }: AgentToolCallProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { agentName } = useAgentThread();
  const tool = AgentHooks.useGetTool(agentName, toolName).data;
  const elapsedMs = useToolCallElapsed();
  const state = toolCallState({ status, isError, result });
  const label = tool?.description ?? toolName;
  const prefix = STATE_PREFIXES[state];
  const error = status.type === "incomplete" && status.error !== undefined ? formatValue(status.error) : undefined;

  return (
    <Box my={0.5}>
      <ButtonBase
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        sx={{
          gap: 0.75,
          borderRadius: 1,
          maxWidth: "100%",
          textAlign: "left",
          "&:hover .tool-label": { color: "text.primary" },
        }}
      >
        {STATE_ICONS[state]}
        {prefix && (
          <Typography
            variant="body2"
            color={state === "approval" ? "warning.dark" : "text.secondary"}
            noWrap
            flexShrink={0}
          >
            {prefix}
          </Typography>
        )}
        {state === "running" ? (
          <ShimmerText variant="body2" noWrap>
            {label}
          </ShimmerText>
        ) : (
          <Typography
            variant="body2"
            className="tool-label"
            color="text.secondary"
            noWrap
            sx={{ textDecoration: state === "cancelled" ? "line-through" : "none" }}
          >
            {label}
          </Typography>
        )}
        {elapsedMs !== undefined && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
          >
            {formatDuration(elapsedMs)}
          </Typography>
        )}
        <ExpandMoreIcon
          fontSize="small"
          sx={{ color: "text.secondary", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </ButtonBase>
      {state === "approval" && <AgentToolApproval toolCallId={toolCallId} argsText={argsText} />}
      <Collapse in={isOpen} timeout={200} unmountOnExit>
        <Stack spacing={1} sx={{ mt: 0.5, mb: 1, pl: 3.5 }}>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
            {toolName}
          </Typography>
          <CodeBlock title="Arguments" text={formatValue(argsText || "{}")} />
          {result !== undefined && <ResultEntities toolName={toolName} result={result} />}
          {result !== undefined && <CodeBlock title="Result" text={formatValue(result)} />}
          {error !== undefined && <CodeBlock title="Error" text={error} />}
        </Stack>
      </Collapse>
    </Box>
  );
});
