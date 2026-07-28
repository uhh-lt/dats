/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeFilterReleaseTag } from "./CodeFilterReleaseTag";
import type { CodeRead } from "./CodeRead";
export type CodeFilterVersionRead = {
  code: CodeRead;
  is_current: boolean;
  releases: Array<CodeFilterReleaseTag>;
  filter_value: string;
};
