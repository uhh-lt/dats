/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MemoColumns } from "./MemoColumns";
import type { SortDirection } from "./SortDirection";
export type Sort_MemoColumns_ = {
  /**
   * The column to sort by: an enum member, or an int id referring to a project-metadata column
   */
  column: MemoColumns | number;
  /**
   * Sort direction (asc/desc)
   */
  direction: SortDirection;
};
