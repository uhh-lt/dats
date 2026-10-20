/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SentAnnoColumns__Output } from "./Filter_SentAnnoColumns__Output";
import type { GroupConfig_SentAnnoColumns_ } from "./GroupConfig_SentAnnoColumns_";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { SentAnnoColumns } from "./SentAnnoColumns";
import type { Sort_SentAnnoColumns_ } from "./Sort_SentAnnoColumns_";
export type SentenceSearchViewRead = {
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
  filters: Filter_SentAnnoColumns__Output;
  /**
   * Grouping of the SearchView (None = no grouping)
   */
  group_by?: GroupConfig_SentAnnoColumns_ | null;
  /**
   * Sort order of the SearchView
   */
  sorts?: Array<Sort_SentAnnoColumns_>;
  /**
   * Entity properties to render (None = the frontend's default selection)
   */
  selected_properties?: Array<SentAnnoColumns> | null;
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
