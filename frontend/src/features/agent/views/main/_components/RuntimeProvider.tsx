import { HttpAgent } from "@ag-ui/client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { useMemo } from "react";

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const agent = useMemo(
    () =>
      new HttpAgent({
        url: "http://localhost:10120/agent/agui/project",
        headers: { authorization: `Bearer ${localStorage.getItem("dats-access")}` },
      }),
    [],
  );

  const runtime = useAgUiRuntime({ agent });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
