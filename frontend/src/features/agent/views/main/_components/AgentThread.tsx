import { ThreadPrimitive } from "@assistant-ui/react";
import { getIconComponent, Icon } from "@components/icons";
import { Box, Stack, Typography } from "@mui/material";
import { AgentApprovals } from "./AgentApprovals";
import { AgentComposer } from "./AgentComposer";
import { AgentMessage } from "./AgentMessage";

/** The messages of the current chat, the pending approvals and the prompt input. */
export function AgentThread() {
  return (
    <ThreadPrimitive.Root asChild>
      <Stack flex={1} minHeight={0}>
        <ThreadPrimitive.Viewport asChild>
          <Box sx={{ flex: 1, overflowY: "auto", px: 2, pt: 2 }}>
            <ThreadPrimitive.Empty>
              <Stack alignItems="center" spacing={1} mt={8} color="text.secondary">
                {getIconComponent(Icon.AGENT, { fontSize: "large" })}
                <Typography variant="h6">How can I help with this project?</Typography>
                <Typography variant="body2">
                  The agent reads and changes your project data. It asks before it deletes anything.
                </Typography>
              </Stack>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages>
              {({ message }) => <AgentMessage role={message.role} isEmpty={message.content.length === 0} />}
            </ThreadPrimitive.Messages>
          </Box>
        </ThreadPrimitive.Viewport>
        <AgentApprovals />
        <AgentComposer />
      </Stack>
    </ThreadPrimitive.Root>
  );
}
