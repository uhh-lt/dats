import { PromptHooks } from "@core/prompt";
import { PromptContent } from "@models/PromptContent";
import { PromptRead } from "@models/PromptRead";
import { useCallback } from "react";

/** A name for the copy of a prompt that no prompt of the project has yet. */
function copyName(name: string, existingNames: Set<string>): string {
  const base = `${name} (copy)`;
  if (!existingNames.has(base)) return base;
  let index = 2;
  while (existingNames.has(`${name} (copy ${index})`)) index += 1;
  return `${name} (copy ${index})`;
}

/**
 * Duplicates a prompt as a new prompt with one version: by default its latest version, or the given (possibly
 * unsaved) content of the editor.
 */
export function useDuplicatePrompt(projectId: number, onDuplicated: (prompt: PromptRead) => void) {
  const prompts = PromptHooks.useGetAllPrompts({ projectId, includeArchived: true });
  const { mutate: createPromptMutation, isPending } = PromptHooks.useCreatePrompt();

  const duplicate = useCallback(
    (prompt: PromptRead, content?: PromptContent) => {
      const source = content ?? prompt.versions[prompt.versions.length - 1];
      const existingNames = new Set((prompts.data ?? []).map((candidate) => candidate.name));
      createPromptMutation(
        {
          requestBody: {
            project_id: projectId,
            name: copyName(prompt.name, existingNames),
            task_type: prompt.task_type,
            language: prompt.language,
            text: source.text,
            settings: source.settings,
            codes: source.codes,
            examples: source.examples,
            tags: source.tags,
            metadata_fields: source.metadata_fields,
          },
        },
        { onSuccess: onDuplicated },
      );
    },
    [prompts.data, createPromptMutation, projectId, onDuplicated],
  );

  return { duplicate, isPending };
}
