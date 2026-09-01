/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Params for single-strategy tasks (tagging, metadata, sentence annotation).
 */
export type DefaultStrategyParams = {
  llm_strategy_type: DefaultStrategyParams.llm_strategy_type;
};
export namespace DefaultStrategyParams {
  export enum llm_strategy_type {
    TAGGING_DEFAULT = "TAGGING_DEFAULT",
    METADATA_DEFAULT = "METADATA_DEFAULT",
    SENTENCE_ANNOTATION_DEFAULT = "SENTENCE_ANNOTATION_DEFAULT",
  }
}
