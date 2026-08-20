/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_BBoxColumns__Input } from "./Filter_BBoxColumns__Input";
import type { GroupConfig_BBoxColumns_ } from "./GroupConfig_BBoxColumns_";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_BBoxColumns_ } from "./Sort_BBoxColumns_";
export type BBoxSearchViewUpdate = {
  name?: string | null;
  layout?: SearchViewLayout | null;
  filters?: Filter_BBoxColumns__Input | null;
  group_by?: GroupConfig_BBoxColumns_ | null;
  sorts?: Array<Sort_BBoxColumns_> | null;
};
