/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentTagCreate = {
  /**
   * Title of the DocumentTag
   */
  title: string;
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
  parent_tag_id?: number | null;
  /**
   * Project the DocumentTag belongs to
   */
  project_id: number;
};
