import { CodeHooks } from "@core/code";
import { ProjectMetadataHooks } from "@core/project-metadata";
import {
  DEFAULT_OUTPUT_FORMATS,
  PromptPreviewSource,
  PromptHooks,
  promptQueries,
  setDocumentUnit,
  toPromptCode,
  toPromptMetadataField,
  toPromptTag,
} from "@core/prompt";
import { TagHooks } from "@core/tag";
import { PromptSnapshot } from "@models/PromptSnapshot";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface WizardPrompt {
  // what the preview renders and the job runs; undefined while it is loading
  source: PromptPreviewSource | undefined;
  // the codes whose existing assistant annotations a run can delete
  codeIds: number[];
  isError: boolean;
}

/**
 * The prompt of the wizard: in guided mode the default prompt of the task with the wizard's selections and settings
 * (unsaved, nothing is stored), in prompt mode the selected prompt version.
 */
export function useWizardPrompt(): WizardPrompt {
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const mode = useAppSelector((state) => state.llmAssistant.mode);
  const method = useAppSelector((state) => state.llmAssistant.method);
  const codeIds = useAppSelector((state) => state.llmAssistant.codeIds);
  const tagIds = useAppSelector((state) => state.llmAssistant.tagIds);
  const projectMetadataIds = useAppSelector((state) => state.llmAssistant.projectMetadataIds);
  const language = useAppSelector((state) => state.llmAssistant.language);
  const outputFormat = useAppSelector((state) => state.llmAssistant.outputFormat);
  const documentUnit = useAppSelector((state) => state.llmAssistant.documentUnit);
  const settings = useAppSelector((state) => state.llmAssistant.settings);
  const versionId = useAppSelector((state) => state.llmAssistant.promptVersionId);

  // prompt mode
  const version = PromptHooks.useGetPromptVersion({ projectId, versionId });

  // guided mode: the default prompt and the selected project data
  const format = outputFormat ?? (method ? DEFAULT_OUTPUT_FORMATS[method] : undefined);
  const defaultPrompt = useQuery({
    ...promptQueries.defaultPrompt(format, language),
    enabled: mode === "guided",
  });
  const codes = CodeHooks.useGetEnabledCodes();
  const tags = TagHooks.useGetAllTags();
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();

  return useMemo(() => {
    if (mode === "prompt") {
      const selected = version.data;
      return {
        source: selected ? { versionId: selected.version.id, text: selected.version.text } : undefined,
        codeIds: (selected?.version.codes ?? []).map((code) => code.code_id),
        isError: version.isError,
      };
    }

    if (!method || !defaultPrompt.data || !codes.data || !tags.data || !metadata.data) {
      return { source: undefined, codeIds, isError: defaultPrompt.isError };
    }
    const prompt = defaultPrompt.data.text;
    const draft: PromptSnapshot = {
      task_type: method,
      language,
      text: documentUnit ? setDocumentUnit(prompt, documentUnit) : prompt,
      settings,
      codes: codes.data.filter((code) => codeIds.includes(code.id)).map(toPromptCode),
      tags: tags.data.filter((tag) => tagIds.includes(tag.id)).map(toPromptTag),
      metadata_fields: metadata.data
        .filter((field) => projectMetadataIds.includes(field.id))
        .map(toPromptMetadataField),
      examples: [],
    };
    return { source: { draft }, codeIds, isError: false };
  }, [
    mode,
    version.data,
    version.isError,
    method,
    defaultPrompt.data,
    defaultPrompt.isError,
    codes.data,
    tags.data,
    metadata.data,
    language,
    documentUnit,
    settings,
    codeIds,
    tagIds,
    projectMetadataIds,
  ]);
}
