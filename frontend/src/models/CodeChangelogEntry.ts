/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeChangeKind } from "./CodeChangeKind";
import type { CodeChangelogChange } from "./CodeChangelogChange";
export type CodeChangelogEntry = {
  change_set_id: string;
  change_kind: CodeChangeKind;
  message: string | null;
  author_id: number | null;
  created: string;
  /**
   * Target branch; null means Main
   */
  branch_id: number | null;
  /**
   * Source branch for a merge into Main
   */
  source_branch_id: number | null;
  changes: Array<CodeChangelogChange>;
};
