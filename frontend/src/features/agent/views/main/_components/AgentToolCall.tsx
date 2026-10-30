import { ToolCallMessagePartProps } from "@assistant-ui/react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { memo } from "react";

type AgentToolCallProps = Pick<ToolCallMessagePartProps, "toolName" | "argsText" | "result" | "isError" | "status">;

// the result pydantic-ai (ToolDenied) returns for a call the user denied
const DENIED_RESULT = "The tool call was denied.";

function ToolCallStatus({ status, isError, result }: Pick<AgentToolCallProps, "status" | "isError" | "result">) {
  if (status.type === "running") return <CircularProgress size={16} />;
  if (status.type === "requires-action") return <Chip size="small" color="warning" label="Needs your approval" />;
  if (status.type === "incomplete")
    return <Chip size="small" label={status.reason === "cancelled" ? "Cancelled" : "Failed"} />;
  if (isError) return <Chip size="small" color="error" label="Failed" />;
  if (result === DENIED_RESULT) return <Chip size="small" label="Denied" />;
  return <Chip size="small" color="success" variant="outlined" label="Done" />;
}

function CodeBlock({ title, text }: { title: string; text: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{ m: 0, p: 1, bgcolor: "grey.100", borderRadius: 1, fontSize: 12, overflowX: "auto", maxHeight: 240 }}
      >
        {text}
      </Box>
    </Box>
  );
}

/** A tool call of the agent (a DATS endpoint): its name, status, arguments and result. */
export const AgentToolCall = memo(({ toolName, argsText, result, isError, status }: AgentToolCallProps) => {
  return (
    <Accordion disableGutters variant="outlined" sx={{ my: 1, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontFamily="monospace">
            {toolName}
          </Typography>
          <ToolCallStatus status={status} isError={isError} result={result} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <CodeBlock title="Arguments" text={argsText || "{}"} />
          {result !== undefined && <CodeBlock title="Result" text={JSON.stringify(result, null, 2)} />}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
});
