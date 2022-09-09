/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SpanEntity } from "./SpanEntity";

export type SpanEntityStat = {
  /**
   * The ID of the SourceDocument.
   */
  sdoc_id: number;
  /**
   * The counted SpanEntity.
   */
  span_entity: SpanEntity;
  /**
   * Number of occurrences of the SpanEntity in the SourceDocument.
   */
  count: number;
};
