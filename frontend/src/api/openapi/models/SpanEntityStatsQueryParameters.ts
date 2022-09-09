/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SpanEntityStatsQueryParameters = {
  /**
   * The ID of the Project the SourceDocuments have to belong to.
   */
  proj_id: number;
  /**
   * List of IDs of SourceDocuments the stats are computed for.
   */
  sdoc_ids: Array<number>;
};
