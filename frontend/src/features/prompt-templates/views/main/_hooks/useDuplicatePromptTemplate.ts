import { PromptTemplateHooks } from "@core/prompt-template";
import { PromptTemplateContent } from "@models/PromptTemplateContent";
import { PromptTemplateRead } from "@models/PromptTemplateRead";
import { useCallback } from "react";

/** A name for the copy of a template that no template of the project has yet. */
function copyName(name: string, existingNames: Set<string>): string {
  const base = `${name} (copy)`;
  if (!existingNames.has(base)) return base;
  let index = 2;
  while (existingNames.has(`${name} (copy ${index})`)) index += 1;
  return `${name} (copy ${index})`;
}

/**
 * Duplicates a template as a new template with one version: by default its latest version, or the given (possibly
 * unsaved) content of the editor.
 */
export function useDuplicatePromptTemplate(projectId: number, onDuplicated: (template: PromptTemplateRead) => void) {
  const templates = PromptTemplateHooks.useGetAllPromptTemplates({ projectId, includeArchived: true });
  const { mutate: createPromptTemplateMutation, isPending } = PromptTemplateHooks.useCreatePromptTemplate();

  const duplicate = useCallback(
    (template: PromptTemplateRead, content?: PromptTemplateContent) => {
      const source = content ?? template.versions[template.versions.length - 1];
      const existingNames = new Set((templates.data ?? []).map((candidate) => candidate.name));
      createPromptTemplateMutation(
        {
          requestBody: {
            project_id: projectId,
            name: copyName(template.name, existingNames),
            task_type: template.task_type,
            language: template.language,
            prompt: source.prompt,
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
    [templates.data, createPromptTemplateMutation, projectId, onDuplicated],
  );

  return { duplicate, isPending };
}
