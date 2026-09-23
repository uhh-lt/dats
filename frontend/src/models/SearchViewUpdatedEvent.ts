/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxSearchViewRead } from "./BBoxSearchViewRead";
import type { MemoSearchViewRead } from "./MemoSearchViewRead";
import type { SentenceSearchViewRead } from "./SentenceSearchViewRead";
import type { SpanSearchViewRead } from "./SpanSearchViewRead";
export type SearchViewUpdatedEvent = {
  type?: string;
  payload: MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead;
};
