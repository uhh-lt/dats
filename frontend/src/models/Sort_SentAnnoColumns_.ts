/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SentAnnoColumns } from "./SentAnnoColumns";
import type { SortDirection } from "./SortDirection";
export type Sort_SentAnnoColumns_ = {
  /**
   * The column to sort by: an enum member, or an int id referring to a project-metadata column
   */
  column: SentAnnoColumns | number;
  /**
   * Sort direction (asc/desc)
   */
  direction: SortDirection;
};
