/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SpanColumns__Input } from "./Filter_SpanColumns__Input";
import type { GroupConfig_SpanColumns_ } from "./GroupConfig_SpanColumns_";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_SpanColumns_ } from "./Sort_SpanColumns_";
export type SpanSearchViewUpdate = {
  name?: string | null;
  layout?: SearchViewLayout | null;
  filters?: Filter_SpanColumns__Input | null;
  group_by?: GroupConfig_SpanColumns_ | null;
  sorts?: Array<Sort_SpanColumns_> | null;
};
