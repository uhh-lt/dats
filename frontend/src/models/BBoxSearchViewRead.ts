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
  entity_type?: string;
  project_id: number;
  name: string;
  layout: SearchViewLayout;
  /**
   * The filter of the Concept
   */
  filters: Filter_BBoxColumns__Output;
  group_by?: GroupConfig_BBoxColumns_ | null;
  sorts?: Array<Sort_BBoxColumns_>;
  selected_properties?: Array<BBoxColumns> | null;
  id: number;
  user_id: number;
  position: number;
  created: string;
  updated: string;
};
