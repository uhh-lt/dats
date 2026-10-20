/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxColumns } from "./BBoxColumns";
import type { Filter_BBoxColumns__Input } from "./Filter_BBoxColumns__Input";
import type { GroupConfig_BBoxColumns_ } from "./GroupConfig_BBoxColumns_";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_BBoxColumns_ } from "./Sort_BBoxColumns_";
export type BBoxSearchViewUpdate = {
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
  filters?: Filter_BBoxColumns__Input | null;
  /**
   * Grouping of the SearchView (null = no grouping)
   */
  group_by?: GroupConfig_BBoxColumns_ | null;
  /**
   * Sort order of the SearchView
   */
  sorts?: Array<Sort_BBoxColumns_> | null;
  /**
   * Entity properties to render (null = the frontend's default selection)
   */
  selected_properties?: Array<BBoxColumns> | null;
};
