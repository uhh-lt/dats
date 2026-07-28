/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeBranchChangeType } from "./CodeBranchChangeType";
import type { CodeChangedField } from "./CodeChangedField";
import type { CodeRead } from "./CodeRead";
export type CodeBranchChangeRead = {
  concept_id: string;
  change_type: CodeBranchChangeType;
  changed_fields: Array<CodeChangedField>;
  branch_code: CodeRead;
  base_main_code: CodeRead | null;
  current_main_code: CodeRead | null;
  is_conflict: boolean;
};
