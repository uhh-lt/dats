/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A virtual user: a user without login that belongs to one project and owns
 * annotations, e.g. of an LLM Assistant run.
 */
export type VirtualUserCreate = {
  /**
   * Name of the virtual user, unique per project
   */
  name: string;
};
