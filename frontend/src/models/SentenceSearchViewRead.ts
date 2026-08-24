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
  entity_type?: string;
  project_id: number;
  name: string;
  layout: SearchViewLayout;
  /**
   * The filter of the Concept
   */
  filters: Filter_SentAnnoColumns__Output;
  group_by?: GroupConfig_SentAnnoColumns_ | null;
  sorts?: Array<Sort_SentAnnoColumns_>;
  selected_properties?: Array<SentAnnoColumns> | null;
  id: number;
  user_id: number;
  position: number;
  created: string;
  updated: string;
};
