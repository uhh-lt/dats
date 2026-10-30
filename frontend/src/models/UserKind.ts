/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Whether a user is a person with a login or a virtual annotator.
 *
 * Virtual annotators belong to exactly one project and only own annotations
 * (e.g. the output of an LLM Assistant run). They have no email and no
 * password, can never log in and are no project members.
 */
export enum UserKind {
  HUMAN = "human",
  VIRTUAL = "virtual",
}
