/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeChangedField } from "./CodeChangedField";
import type { CodeRead } from "./CodeRead";
export type CodeChangelogChange = {
  before: CodeRead | null;
  after: CodeRead;
  merged_from: CodeRead | null;
  changed_fields: Array<CodeChangedField>;
};
