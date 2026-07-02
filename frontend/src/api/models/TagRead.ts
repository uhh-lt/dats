/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TagRead = {
  /**
   * Title of the Tag
   */
  name: string;
  /**
   * Color of the Tag
   */
  color: string;
  /**
   * Description of the Tag
   */
  description?: string | null;
  /**
   * Parent of the Tag
   */
  parent_id?: number | null;
  /**
   * ID of the Tag
   */
  id: number;
  /**
   * Project the Tag belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the Tag
   */
  created: string;
  /**
   * Updated timestamp of the Tag
   */
  updated: string;
  /**
   * Memo IDs attached to the Tag
   */
  memo_ids: Array<number>;
};
