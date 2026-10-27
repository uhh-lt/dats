/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeDefinition } from "./CodeDefinition";
export type SentenceAnnotationParams = {
  /**
   * The type of the LLM Assistant task
   */
  task_type: string;
  /**
   * IDs of the source documents to analyse
   */
  sdoc_ids: Array<number>;
  /**
   * IDs of the codes to use for the annotation
   */
  code_ids: Array<number>;
  /**
   * Code definitions to render into the prompts instead of the project's current definitions of the codes (e.g. experiment-scoped drafts). If set, it contains exactly one definition per code in code_ids.
   */
  code_definitions?: Array<CodeDefinition> | null;
  /**
   * Delete existing annotations before creating new ones
   */
  delete_existing_annotations?: boolean;
};
