/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CodeCreate = {
  /**
   * Name of the Code
   */
  name: string;
  /**
   * Color of the Code
   */
  color?: string;
  /**
   * Description of the Code
   */
  description?: string;
  /**
   * Logical parent concept of the Code
   */
  parent_concept_id?: string | null;
  /**
   * Whether the code is available for annotation and preprocessing
   */
  enabled?: boolean;
  /**
   * Project the Code belongs to
   */
  project_id: number;
  /**
   * Is the Code a system code
   */
  is_system?: boolean;
  /**
   * Target branch; null creates the Code on Main
   */
  branch_id?: number | null;
  commit_message?: string | null;
};
