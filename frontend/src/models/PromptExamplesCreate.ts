/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptExampleKind } from "./PromptExampleKind";
/**
 * Selects annotations to turn into few-shot examples.
 */
export type PromptExamplesCreate = {
  /**
   * Project the annotations belong to
   */
  project_id: number;
  /**
   * The kind of the annotations
   */
  kind: PromptExampleKind;
  /**
   * IDs of the span or sentence annotations
   */
  annotation_ids: Array<number>;
};
