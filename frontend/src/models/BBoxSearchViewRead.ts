/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxColumns } from "./BBoxColumns";
import type { Filter_BBoxColumns__Output } from "./Filter_BBoxColumns__Output";
import type { GroupConfig_BBoxColumns_ } from "./GroupConfig_BBoxColumns_";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_BBoxColumns_ } from "./Sort_BBoxColumns_";
export type BBoxSearchViewRead = {
  /**
   * Searchable entity the SearchView is for
   */
  entity_type?: string;
  /**
   * Project the SearchView belongs to
   */
  project_id: number;
  /**
   * Name of the SearchView
   */
  name: string;
  /**
   * Layout of the SearchView
   */
  layout: SearchViewLayout;
  /**
   * Filter of the SearchView
   */
  filters: Filter_BBoxColumns__Output;
  /**
   * Grouping of the SearchView (None = no grouping)
   */
  group_by?: GroupConfig_BBoxColumns_ | null;
  /**
   * Sort order of the SearchView
   */
  sorts?: Array<Sort_BBoxColumns_>;
  /**
   * Entity properties to render (None = the frontend's default selection)
   */
  selected_properties?: Array<BBoxColumns> | null;
  /**
   * ID of the SearchView
   */
  id: number;
  /**
   * User the SearchView belongs to
   */
  user_id: number;
  /**
   * Position of the SearchView in the user's list
   */
  position: number;
  /**
   * Created timestamp of the SearchView
   */
  created: string;
  /**
   * Updated timestamp of the SearchView
   */
  updated: string;
};
