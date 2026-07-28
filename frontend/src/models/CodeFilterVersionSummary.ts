/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeFilterVersionRead } from "./CodeFilterVersionRead";
export type CodeFilterVersionSummary = {
  concept_id: string;
  current: CodeFilterVersionRead;
  released: Array<CodeFilterVersionRead>;
  recent: Array<CodeFilterVersionRead>;
  total: number;
};
