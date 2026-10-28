import { Thread } from "@api/components/assistant-ui/elements/thread.aui";
import { Box } from "@mui/material";
import { RuntimeProvider } from "./_components/RuntimeProvider";

export function AgentView() {
  return (
    <Box sx={{ height: "100%", overflowY: "auto", pb: 2 }}>
      <RuntimeProvider>
        <Thread />
      </RuntimeProvider>
    </Box>
  );
}
