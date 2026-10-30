import { ToolCallMessagePartProps, useToolCallElapsed } from "@assistant-ui/react";
import BlockIcon from "@mui/icons-material/Block";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PanToolOutlinedIcon from "@mui/icons-material/PanToolOutlined";
import { Box, ButtonBase, CircularProgress, Collapse, Stack, Typography } from "@mui/material";
import { memo, ReactNode, useState } from "react";
import { ShimmerText } from "./ShimmerText";

type AgentToolCallProps = Pick<ToolCallMessagePartProps, "toolName" | "argsText" | "result" | "isError" | "status">;

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

const STATE_LABELS: Record<ToolCallState, string> = {
  running: "Calling",
  approval: "Waiting for your approval:",
  done: "Called",
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

/**
 * A tool call of the agent (a DATS endpoint): its state, name and duration,
 * and on click its arguments, result and error.
 */
export const AgentToolCall = memo(({ toolName, argsText, result, isError, status }: AgentToolCallProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const elapsedMs = useToolCallElapsed();
  const state = toolCallState({ status, isError, result });
  const error = status.type === "incomplete" && status.error !== undefined ? formatValue(status.error) : undefined;

  return (
    <Box my={0.5}>
      <ButtonBase
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        sx={{ gap: 0.75, borderRadius: 1, maxWidth: "100%", "&:hover .tool-name": { textDecoration: "underline" } }}
      >
        {STATE_ICONS[state]}
        {state === "running" ? (
          <ShimmerText variant="body2">{STATE_LABELS[state]}</ShimmerText>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {STATE_LABELS[state]}
          </Typography>
        )}
        <Typography
          variant="body2"
          className="tool-name"
          fontFamily="monospace"
          noWrap
          sx={{ textDecoration: state === "cancelled" ? "line-through" : "none" }}
        >
          {toolName}
        </Typography>
        {elapsedMs !== undefined && (
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatDuration(elapsedMs)}
          </Typography>
        )}
        <ExpandMoreIcon
          fontSize="small"
          sx={{ color: "text.secondary", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </ButtonBase>
      <Collapse in={isOpen} timeout={200} unmountOnExit>
        <Stack spacing={1} sx={{ mt: 0.5, mb: 1, pl: 3.5 }}>
          <CodeBlock title="Arguments" text={formatValue(argsText || "{}")} />
          {result !== undefined && <CodeBlock title="Result" text={formatValue(result)} />}
          {error !== undefined && <CodeBlock title="Error" text={error} />}
        </Stack>
      </Collapse>
    </Box>
  );
});
