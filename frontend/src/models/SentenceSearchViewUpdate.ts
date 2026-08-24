/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SentAnnoColumns__Input } from "./Filter_SentAnnoColumns__Input";
import type { GroupConfig_SentAnnoColumns_ } from "./GroupConfig_SentAnnoColumns_";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { SentAnnoColumns } from "./SentAnnoColumns";
import type { Sort_SentAnnoColumns_ } from "./Sort_SentAnnoColumns_";
export type SentenceSearchViewUpdate = {
  name?: string | null;
  layout?: SearchViewLayout | null;
  filters?: Filter_SentAnnoColumns__Input | null;
  group_by?: GroupConfig_SentAnnoColumns_ | null;
  sorts?: Array<Sort_SentAnnoColumns_> | null;
  selected_properties?: Array<SentAnnoColumns> | null;
};
