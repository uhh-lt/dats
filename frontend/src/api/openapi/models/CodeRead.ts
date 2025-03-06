/* generated using openapi-typescript-codegen -- do not edit */
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
   * While false, the code is neither created in pre-processing nor shown in the UI (except in settings to enable it again)
   */
  enabled?: boolean;
  /**
   * ID of the Code
   */
  id: number;
  /**
   * Project the Code belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the Code
   */
  created: string;
  /**
   * Updated timestamp of the Code
   */
  updated: string;
  /**
   * Is the Code a system code
   */
  is_system: boolean;
};
