import { generalQueries } from "@api/general/generalQueries";
import { MenuItem, Stack, TextField } from "@mui/material";
import { AgentName } from "@models/AgentName";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent } from "react";
import { DEFAULT_MODEL } from "../_utils/agentClientUtils";

const AGENT_LABELS: Record<AgentName, string> = {
  [AgentName.PROJECT]: "Project agent",
  [AgentName.SOURCE_DOCUMENT]: "Document & annotation agent",
};

interface AgentToolbarProps {
  agentName: AgentName;
  modelName: string;
  onAgentNameChange: (agentName: AgentName) => void;
  onModelNameChange: (modelName: string) => void;
}

/** Selects the agent (which DATS tools it has) and the LLM it runs on. */
export function AgentToolbar({ agentName, modelName, onAgentNameChange, onModelNameChange }: AgentToolbarProps) {
  const models = useQuery(generalQueries.availableModels());

  const handleAgentNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const name = Object.values(AgentName).find((value) => value === event.target.value);
    if (name) onAgentNameChange(name);
  };

  return (
    <Stack direction="row" spacing={2} p={2}>
      <TextField
        select
        size="small"
        label="Agent"
        value={agentName}
        onChange={handleAgentNameChange}
        sx={{ minWidth: 240 }}
      >
        {Object.values(AgentName).map((name) => (
          <MenuItem key={name} value={name}>
            {AGENT_LABELS[name]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="LLM"
        value={modelName}
        onChange={(event) => onModelNameChange(event.target.value)}
        helperText={models.isError ? "Could not load the LLMs" : undefined}
        sx={{ minWidth: 320 }}
      >
        <MenuItem value={DEFAULT_MODEL}>Default{models.data?.[0] ? ` (${models.data[0]})` : ""}</MenuItem>
        {models.data?.map((model) => (
          <MenuItem key={model} value={model}>
            {model}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
