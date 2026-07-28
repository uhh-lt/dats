/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodebookReleaseChangeType } from "./CodebookReleaseChangeType";
import type { CodeChangedField } from "./CodeChangedField";
import type { CodeRead } from "./CodeRead";
export type CodebookReleaseComparisonChange = {
  concept_id: string;
  change_type: CodebookReleaseChangeType;
  before: CodeRead | null;
  after: CodeRead | null;
  changed_fields: Array<CodeChangedField>;
};
