import { useAgUiInterrupts, useAgUiSubmitInterruptResponses } from "@assistant-ui/react-ag-ui";
import { useOpenSnackbar } from "@core/notification";
import { AgentName } from "@models/AgentName";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { AgentThreadContext } from "./agentThreadContext";

interface AgentThreadProviderProps {
  agentName: AgentName;
  children: ReactNode;
}

/**
 * Collects the user's answers to the pending approvals. The backend resumes
 * the run only with an answer to every pending tool call, so the answers are
 * sent together once the last one is given.
 */
export function AgentThreadProvider({ agentName, children }: AgentThreadProviderProps) {
  const interrupts = useAgUiInterrupts();
  const submitInterruptResponses = useAgUiSubmitInterruptResponses();
  const openSnackbar = useOpenSnackbar();
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  const decide = useCallback(
    (interruptIds: string[], approved: boolean) => {
      const nextDecisions = { ...decisions };
      interruptIds.forEach((interruptId) => (nextDecisions[interruptId] = approved));
      if (!interrupts.every((interrupt) => interrupt.id in nextDecisions)) {
        setDecisions(nextDecisions);
        return;
      }
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
    },
    [decisions, interrupts, submitInterruptResponses, openSnackbar],
  );

  const value = useMemo(
    () => ({ agentName, interrupts, decisions, decide }),
    [agentName, interrupts, decisions, decide],
  );

  return <AgentThreadContext.Provider value={value}>{children}</AgentThreadContext.Provider>;
}
