/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TagCreate = {
  /**
   * Title of the Tag
   */
  name: string;
  /**
   * Color of the Code
   */
  color?: string;
  /**
   * Description of the Tag
   */
  description?: string | null;
  /**
   * Parent of the Tag
   */
  parent_id?: number | null;
  /**
   * Project the Tag belongs to
   */
  project_id: number;
};
