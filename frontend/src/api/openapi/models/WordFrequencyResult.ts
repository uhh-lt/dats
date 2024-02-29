/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WordFrequencyStat } from "./WordFrequencyStat";
export type WordFrequencyResult = {
  /**
   * The total number of word_frequencies. Used for pagination.
   */
  total_results: number;
  /**
   * The total number of SourceDocuments.
   */
  sdocs_total: number;
  /**
   * The total number of words.
   */
  words_total: number;
  /**
   * The WordFrequencies.
   */
  word_frequencies: Array<WordFrequencyStat>;
};
