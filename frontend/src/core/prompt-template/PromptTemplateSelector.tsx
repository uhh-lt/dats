import { PromptTemplateRead } from "@models/PromptTemplateRead";
import { PromptTemplateVersionRead } from "@models/PromptTemplateVersionRead";
import { TaskType } from "@models/TaskType";
import { Alert, Chip, ListItemText, MenuItem, Stack, TextField } from "@mui/material";
import { ChangeEvent, useCallback } from "react";
import { PromptTemplateHooks } from "./api/promptTemplateHooks";
import { LANGUAGE_LABELS, TASK_TYPE_LABELS } from "./promptTemplateUtils";

interface PromptTemplateSelectorProps {
  projectId: number;
  // without a task, the templates of all tasks are offered
  taskType?: TaskType;
  versionId: number | undefined;
  onChange: (selection: { template: PromptTemplateRead; version: PromptTemplateVersionRead } | undefined) => void;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Summarizes what a version selects, e.g. "3 codes, 2 examples". */
function describeSelections(version: PromptTemplateVersionRead): string {
  const parts = [
    version.codes?.length ? plural(version.codes.length, "code") : undefined,
    version.examples?.length ? plural(version.examples.length, "example") : undefined,
    version.tags?.length ? plural(version.tags.length, "tag") : undefined,
    version.metadata_fields?.length ? plural(version.metadata_fields.length, "metadata field") : undefined,
  ].filter((part) => part !== undefined);
  return parts.length === 0 ? "nothing selected" : parts.join(", ");
}

/** Selects a version of one of the project's active prompt templates, optionally of one task. */
export function PromptTemplateSelector({ projectId, taskType, versionId, onChange }: PromptTemplateSelectorProps) {
  const templates = PromptTemplateHooks.useGetAllPromptTemplates({ projectId, taskType });
  const selected = PromptTemplateHooks.useGetPromptTemplateVersion({ projectId, versionId });

  const handleChangeTemplate = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const template = templates.data?.find((candidate) => candidate.id === Number(event.target.value));
      const latest = template?.versions[template.versions.length - 1];
      onChange(template && latest ? { template, version: latest } : undefined);
    },
    [templates.data, onChange],
  );

  const handleChangeVersion = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const template = selected.data?.template;
      const version = template?.versions.find((candidate) => candidate.id === Number(event.target.value));
      if (template && version) onChange({ template, version });
    },
    [selected.data, onChange],
  );

  if (templates.isSuccess && templates.data.length === 0) {
    return (
      <Alert severity="warning">
        The project has no active prompt template{taskType ? " for this task" : ""}. Create one on the Prompts page.
      </Alert>
    );
  }

  const selectedTemplate = selected.data?.template;
  return (
    <Stack direction="row" spacing={2}>
      <TextField
        select
        fullWidth
        label="Prompt template"
        value={selectedTemplate?.id ?? ""}
        onChange={handleChangeTemplate}
        disabled={!templates.isSuccess}
      >
        {!templates.data && (
          <MenuItem value="" disabled>
            Loading templates…
          </MenuItem>
        )}
        {templates.data?.map((template) => (
          <MenuItem key={template.id} value={template.id}>
            <ListItemText
              primary={template.name}
              secondary={`${TASK_TYPE_LABELS[template.task_type]}, ${LANGUAGE_LABELS[template.language]}, ${template.versions.length} version(s)`}
            />
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Version"
        value={selected.data?.version.id ?? ""}
        onChange={handleChangeVersion}
        disabled={!selectedTemplate}
        sx={{ minWidth: 260 }}
      >
        {!selectedTemplate && (
          <MenuItem value="" disabled>
            Select a template first
          </MenuItem>
        )}
        {selectedTemplate?.versions
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
