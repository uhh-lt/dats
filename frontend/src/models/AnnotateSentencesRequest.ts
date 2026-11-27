/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTASentenceID } from "./COTASentenceID";
export type AnnotateSentencesRequest = {
  /**
   * The sentences to annotate
   */
  cota_sentence_ids: Array<COTASentenceID>;
  /**
   * The concept of the sentences; none if null
   */
  concept_id?: string | null;
};
