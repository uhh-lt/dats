import { AnnotationParams } from "@models/AnnotationParams";
import { MetadataExtractionParams } from "@models/MetadataExtractionParams";
import { SentenceAnnotationParams } from "@models/SentenceAnnotationParams";
import { TaggingParams } from "@models/TaggingParams";
import { useAppSelector } from "@store/storeHooks";
import { useMemo } from "react";

export type LLMAssistantTaskParameters =
  | TaggingParams
  | MetadataExtractionParams
  | AnnotationParams
  | SentenceAnnotationParams;

/** The task parameters of the wizard's current selection, as the backend expects them. */
export function useTaskParameters(): LLMAssistantTaskParameters | undefined {
  const method = useAppSelector((state) => state.llmAssistant.method);
  const sdocIds = useAppSelector((state) => state.llmAssistant.documentIds);
  const tagIds = useAppSelector((state) => state.llmAssistant.tagIds);
  const projectMetadataIds = useAppSelector((state) => state.llmAssistant.projectMetadataIds);
  const codeIds = useAppSelector((state) => state.llmAssistant.codeIds);
  const deleteExistingAnnotations = useAppSelector((state) => state.llmAssistant.deleteExistingAnnotations);

  return useMemo(() => {
    if (method === undefined) return undefined;
    return {
      task_type: method,
      sdoc_ids: sdocIds,
      tag_ids: tagIds,
      project_metadata_ids: projectMetadataIds,
      code_ids: codeIds,
      delete_existing_annotations: deleteExistingAnnotations,
    };
  }, [method, sdocIds, tagIds, projectMetadataIds, codeIds, deleteExistingAnnotations]);
}
