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
  entity_type?: string;
  project_id: number;
  name: string;
  layout: SearchViewLayout;
  /**
   * The filter of the Concept
   */
  filters: Filter_SpanColumns__Output;
  group_by?: GroupConfig_SpanColumns_ | null;
  sorts?: Array<Sort_SpanColumns_>;
  selected_properties?: Array<SpanColumns> | null;
  id: number;
  user_id: number;
  position: number;
  created: string;
  updated: string;
};
