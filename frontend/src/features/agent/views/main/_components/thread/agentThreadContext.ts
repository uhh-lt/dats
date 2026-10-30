import { AgUiInterrupt } from "@assistant-ui/react-ag-ui";
import { AgentName } from "@models/AgentName";
import { createContext, useContext } from "react";

export interface AgentThreadContextValue {
  projectId: number;
  agentName: AgentName;
  // the tool calls that wait for the user's approval
  interrupts: readonly AgUiInterrupt[];
  // the user's answers so far, by interrupt id; the run resumes once all are answered
  decisions: Readonly<Record<string, boolean>>;
  decide: (interruptIds: string[], approved: boolean) => void;
}

export const AgentThreadContext = createContext<AgentThreadContextValue | undefined>(undefined);

export const useAgentThread = (): AgentThreadContextValue => {
  const value = useContext(AgentThreadContext);
  if (value === undefined) throw new Error("useAgentThread must be used inside an AgentThreadProvider");
  return value;
};
