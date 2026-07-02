/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
import type { PipelineSettings } from "./PipelineSettings";
export type AspectCreate = {
  /**
   * Name of the aspect
   */
  name: string;
  /**
   * Prompt for document embedding
   */
  doc_embedding_prompt: string;
  /**
   * Prompt for document modification
   */
  doc_modification_prompt?: string | null;
  /**
   * Whether the aspect is hierarchical
   */
  is_hierarchical: boolean;
  /**
   * Modality of the documents of this aspect
   */
  modality: DocType;
  /**
   * Pipeline settings for this aspect
   */
  pipeline_settings: PipelineSettings;
  /**
   * ID of the tag associated with this aspect.
   */
  tag_id?: number | null;
  /**
   * ID of the project this aspect belongs to
   */
  project_id: number;
};
