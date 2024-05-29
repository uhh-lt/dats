/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CodeRead = {
  /**
   * Name of the Code
   */
  name: string;
  /**
   * Color of the Code
   */
  color: string;
  /**
   * Description of the Code
   */
  description: string;
  /**
   * Parent of the Code
   */
  parent_id?: number | null;
  /**
   * ID of the Code
   */
  id: number;
  /**
   * Project the Code belongs to
   */
  project_id: number;
  /**
   * User the Code belongs to
   */
  user_id: number;
  /**
   * Created timestamp of the Code
   */
  created: string;
  /**
   * Updated timestamp of the Code
   */
  updated: string;
};
