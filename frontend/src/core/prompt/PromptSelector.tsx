import { PromptRead } from "@models/PromptRead";
import { PromptVersionRead } from "@models/PromptVersionRead";
import { TaskType } from "@models/TaskType";
import { Alert, Chip, ListItemText, MenuItem, Stack, TextField } from "@mui/material";
import { ChangeEvent, useCallback } from "react";
import { PromptHooks } from "./api/promptHooks";
import { LANGUAGE_LABELS, TASK_TYPE_LABELS } from "./promptUtils";

interface PromptSelectorProps {
  projectId: number;
  // without a task, the prompts of all tasks are offered
  taskType?: TaskType;
  versionId: number | undefined;
  onChange: (selection: { prompt: PromptRead; version: PromptVersionRead } | undefined) => void;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Summarizes what a version selects, e.g. "3 codes, 2 examples". */
function describeSelections(version: PromptVersionRead): string {
  const parts = [
    version.codes?.length ? plural(version.codes.length, "code") : undefined,
    version.examples?.length ? plural(version.examples.length, "example") : undefined,
    version.tags?.length ? plural(version.tags.length, "tag") : undefined,
    version.metadata_fields?.length ? plural(version.metadata_fields.length, "metadata field") : undefined,
  ].filter((part) => part !== undefined);
  return parts.length === 0 ? "nothing selected" : parts.join(", ");
}

/** Selects a version of one of the project's active prompts, optionally of one task. */
export function PromptSelector({ projectId, taskType, versionId, onChange }: PromptSelectorProps) {
  const prompts = PromptHooks.useGetAllPrompts({ projectId, taskType });
  const selected = PromptHooks.useGetPromptVersion({ projectId, versionId });

  const handleChangePrompt = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const prompt = prompts.data?.find((candidate) => candidate.id === Number(event.target.value));
      const latest = prompt?.versions[prompt.versions.length - 1];
      onChange(prompt && latest ? { prompt, version: latest } : undefined);
    },
    [prompts.data, onChange],
  );

  const handleChangeVersion = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const prompt = selected.data?.prompt;
      const version = prompt?.versions.find((candidate) => candidate.id === Number(event.target.value));
      if (prompt && version) onChange({ prompt, version });
    },
    [selected.data, onChange],
  );

  if (prompts.isSuccess && prompts.data.length === 0) {
    return (
      <Alert severity="warning">
        The project has no active prompt{taskType ? " for this task" : ""}. Create one on the Prompts page.
      </Alert>
    );
  }

  const selectedPrompt = selected.data?.prompt;
  return (
    <Stack direction="row" spacing={2}>
      <TextField
        select
        fullWidth
        label="Prompt"
        value={selectedPrompt?.id ?? ""}
        onChange={handleChangePrompt}
        disabled={!prompts.isSuccess}
      >
        {!prompts.data && (
          <MenuItem value="" disabled>
            Loading prompts…
          </MenuItem>
        )}
        {prompts.data?.map((prompt) => (
          <MenuItem key={prompt.id} value={prompt.id}>
            <ListItemText
              primary={prompt.name}
              secondary={`${TASK_TYPE_LABELS[prompt.task_type]}, ${LANGUAGE_LABELS[prompt.language]}, ${prompt.versions.length} version(s)`}
            />
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Version"
        value={selected.data?.version.id ?? ""}
        onChange={handleChangeVersion}
        disabled={!selectedPrompt}
        sx={{ minWidth: 260 }}
      >
        {!selectedPrompt && (
          <MenuItem value="" disabled>
            Select a prompt first
          </MenuItem>
        )}
        {selectedPrompt?.versions
          .slice()
          .reverse()
          .map((version, index) => (
            <MenuItem key={version.id} value={version.id}>
              <Stack direction="row" spacing={1} alignItems="center">
                <span>
                  Version {version.version}
                  {index === 0 ? " (latest)" : ""}
                </span>
                <Chip size="small" label={describeSelections(version)} />
              </Stack>
            </MenuItem>
          ))}
      </TextField>
    </Stack>
  );
}
