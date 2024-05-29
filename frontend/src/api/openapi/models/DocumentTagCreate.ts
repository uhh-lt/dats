/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentTagCreate = {
  /**
   * Title of the DocumentTag
   */
  name: string;
  /**
   * Color of the Code
   */
  color?: string;
  /**
   * Description of the DocumentTag
   */
  description?: string | null;
  /**
   * Parent of the DocumentTag
   */
  parent_id?: number | null;
  /**
   * Project the DocumentTag belongs to
   */
  project_id: number;
};
