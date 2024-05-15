/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentTagRead = {
  /**
   * Title of the DocumentTag
   */
  name: string;
  /**
   * Color of the DocumentTag
   */
  color: string;
  /**
   * Description of the DocumentTag
   */
  description?: string | null;
  /**
   * Parent of the DocumentTag
   */
  parent_id?: number | null;
  /**
   * ID of the DocumentTag
   */
  id: number;
  /**
   * Project the DocumentTag belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the DocumentTag
   */
  created: string;
  /**
   * Updated timestamp of the DocumentTag
   */
  updated: string;
};
