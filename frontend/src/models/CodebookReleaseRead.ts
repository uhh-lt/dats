/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CodebookReleaseRead = {
  id: number;
  project_id: number;
  version: string;
  description: string | null;
  created: string;
  code_count: number;
  /**
   * Immediately preceding release in project chronology
   */
  previous_release_id: number | null;
};
