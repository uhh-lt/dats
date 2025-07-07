/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
   * ID of the project this aspect belongs to
   */
  project_id: number;
};
