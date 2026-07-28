/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
export type CodeFilterConceptRead = {
  concept_id: string;
  current: CodeRead;
  path: Array<string>;
  historical_names: Array<string>;
  historical_descriptions: Array<string>;
  filter_value: string;
};
