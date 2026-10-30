import { useAgUiInterrupts, useAgUiSubmitInterruptResponses } from "@assistant-ui/react-ag-ui";
import { useOpenSnackbar } from "@core/notification";
import { Alert, AlertTitle, Box, Button, Chip, Stack } from "@mui/material";
import { useState } from "react";

/**
 * The tool calls the agent wants to make, but which need the user's approval
 * (deletes and other destructive tools). The backend holds the run until the
 * user answers every one of them; a denied call is reported to the agent.
 */
export function AgentApprovals() {
  const interrupts = useAgUiInterrupts();
  const submitInterruptResponses = useAgUiSubmitInterruptResponses();
  const openSnackbar = useOpenSnackbar();
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  if (interrupts.length === 0) return null;

  const handleDecide = (interruptId: string, approved: boolean) => {
    const nextDecisions = { ...decisions, [interruptId]: approved };
    if (!interrupts.every((interrupt) => interrupt.id in nextDecisions)) {
      setDecisions(nextDecisions);
      return;
    }
    // every interrupt is answered: resume the run
    setDecisions({});
    submitInterruptResponses(
      interrupts.map((interrupt) => ({
        interruptId: interrupt.id,
        status: "resolved",
        payload: { approved: nextDecisions[interrupt.id] },
      })),
    ).catch((error: Error) =>
      openSnackbar({ severity: "error", text: `Could not answer the agent: ${error.message}` }),
    );
  };

  return (
    <Alert severity="warning" sx={{ mx: 2, mb: 1 }}>
      <AlertTitle>
        The agent wants to make {interrupts.length === 1 ? "a change that needs" : "changes that need"} your approval
      </AlertTitle>
      <Stack spacing={1}>
        {interrupts.map((interrupt) => (
          <Stack key={interrupt.id} direction="row" spacing={1} alignItems="center">
            <Box component="code" sx={{ flex: 1, fontSize: 12, wordBreak: "break-all" }}>
              {interrupt.message ?? interrupt.toolCallId}
            </Box>
            {interrupt.id in decisions ? (
              <Chip size="small" label={decisions[interrupt.id] ? "Approved" : "Denied"} />
            ) : (
              <>
                <Button size="small" color="error" variant="contained" onClick={() => handleDecide(interrupt.id, true)}>
                  Approve
                </Button>
                <Button size="small" variant="outlined" onClick={() => handleDecide(interrupt.id, false)}>
                  Deny
                </Button>
              </>
            )}
          </Stack>
        ))}
      </Stack>
    </Alert>
  );
}
