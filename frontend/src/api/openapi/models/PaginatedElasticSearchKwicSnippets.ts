/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KwicSnippet } from "./KwicSnippet";
export type PaginatedElasticSearchKwicSnippets = {
  /**
   * The total number of KWIC snippets. Used for pagination.
   */
  total_results: number;
  /**
   * The KWIC snippets for the matched keyword(s).
   */
  snippets: Array<KwicSnippet>;
};
