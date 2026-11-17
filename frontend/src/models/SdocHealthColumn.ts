/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SdocHealthColumn = {
  /**
   * Name of the pipeline step
   */
  step: string;
  /**
   * Titles of the artefacts the step produces, the header of its column
   */
  title: string;
  /**
   * Whether the step is a core step, which every document gets and Recompute plans where it is missing
   */
  core: boolean;
};
