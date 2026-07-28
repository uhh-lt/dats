/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CodeUpdate = {
  /**
   * Name of the Code
   */
  name?: string | null;
  /**
   * Color of the Code
   */
  color?: string | null;
  /**
   * Description of the Code
   */
  description?: string | null;
  /**
   * Logical parent concept of the Code
   */
  parent_concept_id?: string | null;
  enabled?: boolean | null;
  /**
   * Target branch; null targets Main
   */
  branch_id?: number | null;
  commit_message?: string | null;
};
