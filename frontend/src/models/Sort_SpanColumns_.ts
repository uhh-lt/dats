/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SortDirection } from "./SortDirection";
import type { SpanColumns } from "./SpanColumns";
export type Sort_SpanColumns_ = {
  /**
   * The column to sort by: an enum member, or an int id referring to a project-metadata column
   */
  column: SpanColumns | number;
  /**
   * Sort direction (asc/desc)
   */
  direction: SortDirection;
};
