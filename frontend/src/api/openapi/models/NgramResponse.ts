/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Ngram } from "./Ngram";
export type NgramResponse = {
  /**
   * The current frequency of ngrams found.
   */
  current_frequency: number;
  /**
   * The total frequency of ngrams found.
   */
  total_frequency: number;
  /**
   * The list of ngrams found in the document.
   */
  ngrams: Array<Ngram>;
};
