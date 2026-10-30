import { Alert, Button, Stack } from "@mui/material";
import { useAgentThread } from "./agentThreadContext";

/**
 * The note above the composer while tool calls wait for the user's approval
 * (each tool call shows its own Approve / Deny); with several pending calls,
 * also "Approve all" and "Deny all".
 */
export function AgentApprovals() {
  const { interrupts, decisions, decide } = useAgentThread();
  if (interrupts.length === 0) return null;

  const open = interrupts.filter((interrupt) => !(interrupt.id in decisions)).map((interrupt) => interrupt.id);
  const text =
    interrupts.length === 1
      ? "The agent waits for your approval of the change above."
      : `The agent waits for your approval of ${interrupts.length} changes above (${interrupts.length - open.length} answered).`;

  return (
    <Alert
      severity="warning"
      action={
        interrupts.length > 1 && (
          <Stack direction="row" spacing={1}>
            <Button color="inherit" size="small" onClick={() => decide(open, false)}>
              Deny all
            </Button>
            <Button color="inherit" size="small" onClick={() => decide(open, true)}>
              Approve all
            </Button>
          </Stack>
        )
      }
    >
      {text}
    </Alert>
  );
}
