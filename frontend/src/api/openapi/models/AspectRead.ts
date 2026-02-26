/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
import type { PipelineSettings } from "./PipelineSettings";
export type AspectRead = {
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
   * ID of the aspect
   */
  id: number;
  /**
   * ID of the project this aspect belongs to
   */
  project_id: number;
  /**
   * ID of the most recent job associated with the aspect
   */
  most_recent_job_id?: string | null;
};
