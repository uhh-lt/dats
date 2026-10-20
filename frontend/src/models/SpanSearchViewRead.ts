/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SpanColumns__Output } from "./Filter_SpanColumns__Output";
import type { GroupConfig_SpanColumns_ } from "./GroupConfig_SpanColumns_";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_SpanColumns_ } from "./Sort_SpanColumns_";
import type { SpanColumns } from "./SpanColumns";
export type SpanSearchViewRead = {
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
  filters: Filter_SpanColumns__Output;
  /**
   * Grouping of the SearchView (None = no grouping)
   */
  group_by?: GroupConfig_SpanColumns_ | null;
  /**
   * Sort order of the SearchView
   */
  sorts?: Array<Sort_SpanColumns_>;
  /**
   * Entity properties to render (None = the frontend's default selection)
   */
  selected_properties?: Array<SpanColumns> | null;
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
