/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_MemoColumns__Input } from "./Filter_MemoColumns__Input";
import type { GroupConfig_MemoColumns_ } from "./GroupConfig_MemoColumns_";
import type { MemoColumns } from "./MemoColumns";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_MemoColumns_ } from "./Sort_MemoColumns_";
export type MemoSearchViewUpdate = {
  /**
   * Name of the SearchView
   */
  name?: string | null;
  /**
   * Layout of the SearchView
   */
  layout?: SearchViewLayout | null;
  /**
   * Filter of the SearchView
   */
  filters?: Filter_MemoColumns__Input | null;
  /**
   * Grouping of the SearchView (null = no grouping)
   */
  group_by?: GroupConfig_MemoColumns_ | null;
  /**
   * Sort order of the SearchView
   */
  sorts?: Array<Sort_MemoColumns_> | null;
  /**
   * Entity properties to render (null = the frontend's default selection)
   */
  selected_properties?: Array<MemoColumns> | null;
};
