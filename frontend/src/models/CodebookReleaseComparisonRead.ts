/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodebookReleaseComparisonChange } from "./CodebookReleaseComparisonChange";
import type { CodebookReleaseRead } from "./CodebookReleaseRead";
export type CodebookReleaseComparisonRead = {
  base_release: CodebookReleaseRead;
  target_release: CodebookReleaseRead | null;
  target_is_latest: boolean;
  added_count: number;
  modified_count: number;
  removed_count: number;
  unchanged_count: number;
  changes: Array<CodebookReleaseComparisonChange>;
};
