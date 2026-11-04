import { generalQueries } from "@api/general/generalQueries";
import { Autocomplete, MenuItem, Stack, TextField } from "@mui/material";
import { AgentName } from "@models/AgentName";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useMemo } from "react";
import { AGENT_LABELS } from "../_utils/agentLabelUtils";
import { DEFAULT_MODEL } from "../../../_utils/agentModelUtils";

interface AgentToolbarProps {
  agentName: AgentName;
  modelName: string;
  onAgentNameChange: (agentName: AgentName) => void;
  onModelNameChange: (modelName: string) => void;
}

/** Selects the agent (which DATS tools it has) and the LLM it runs on. */
export function AgentToolbar({ agentName, modelName, onAgentNameChange, onModelNameChange }: AgentToolbarProps) {
  const models = useQuery(generalQueries.availableModels());
  const options = useMemo(() => [DEFAULT_MODEL, ...(models.data ?? [])], [models.data]);

  const handleAgentNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const name = Object.values(AgentName).find((value) => value === event.target.value);
    if (name) onAgentNameChange(name);
  };
  const modelLabel = (option: string) =>
    option === DEFAULT_MODEL ? `Default${models.data?.[0] ? ` (${models.data[0]})` : ""}` : option;

  return (
    <Stack direction="row" spacing={2} p={2}>
      <TextField
        select
        size="small"
        label="Agent"
        value={agentName}
        onChange={handleAgentNameChange}
        helperText="Another agent starts a new chat"
        sx={{ minWidth: 240 }}
      >
        {Object.values(AgentName).map((name) => (
          <MenuItem key={name} value={name}>
            {AGENT_LABELS[name]}
          </MenuItem>
        ))}
      </TextField>
      <Autocomplete
        size="small"
        disableClearable
        options={options}
        value={modelName}
        loading={models.isLoading}
        getOptionLabel={modelLabel}
        onChange={(_event, value) => onModelNameChange(value)}
        sx={{ minWidth: 360 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="LLM"
            helperText={models.isError ? "Could not load the LLMs" : "Search by name"}
          />
        )}
      />
    </Stack>
  );
}
