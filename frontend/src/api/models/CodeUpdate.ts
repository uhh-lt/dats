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
   * Parent of the Code
   */
  parent_id?: number | null;
  /**
   * While false, the code is neither created in pre-processing nor shown in the UI (except in settings to enable it again)
   */
  enabled?: boolean | null;
};
