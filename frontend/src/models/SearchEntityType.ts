/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The searchable entity a saved view is for.
 *
 * Each value maps to one column enum (`MemoColumns`, `SpanColumns`, ...). The
 * value is stored in `SearchViewORM.entity_type` and used as the discriminator
 * for the create/read/update unions below. Sdoc is deliberately omitted: it is
 * ElasticSearch-backed and not part of the unified search flow yet.
 */
export enum SearchEntityType {
  MEMO = "memo",
  SPAN_ANNOTATION = "span_annotation",
  SENTENCE_ANNOTATION = "sentence_annotation",
  BBOX_ANNOTATION = "bbox_annotation",
}
