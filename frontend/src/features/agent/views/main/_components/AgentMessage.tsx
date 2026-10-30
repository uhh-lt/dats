import { MessagePrimitive } from "@assistant-ui/react";
import { Box, Paper } from "@mui/material";
import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentToolCall } from "./AgentToolCall";

interface AgentMessageProps {
  role: "user" | "assistant" | "system";
  // a run that failed before the agent answered leaves an empty message
  isEmpty: boolean;
}

/** One message of the thread: text as Markdown, tool calls as AgentToolCall. */
export const AgentMessage = memo(({ role, isEmpty }: AgentMessageProps) => {
  if (role === "system" || isEmpty) return null;

  const isUser = role === "user";
  return (
    <MessagePrimitive.Root asChild>
      <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1,
            maxWidth: isUser ? "75%" : "100%",
            minWidth: 0,
            bgcolor: isUser ? "grey.100" : "background.paper",
            "& p": { my: 0.5 },
            "& pre": { overflowX: "auto" },
          }}
        >
          <MessagePrimitive.Parts>
            {({ part }) => {
              if (part.type === "text") return <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>;
              if (part.type === "tool-call") return <AgentToolCall {...part} />;
              return null;
            }}
          </MessagePrimitive.Parts>
        </Paper>
      </Box>
    </MessagePrimitive.Root>
  );
});
