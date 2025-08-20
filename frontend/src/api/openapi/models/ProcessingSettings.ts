/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Language } from "./Language";
export type ProcessingSettings = {
  /**
   * Whether to extract images from the documents
   */
  extract_images: boolean;
  /**
   * Number of pages to chunk the documents into
   */
  pages_per_chunk: number;
  /**
   * Number of keywords to extract
   */
  keyword_number: number;
  /**
   * Threshold for keyword deduplication (0.0 - 1.0)
   */
  keyword_deduplication_threshold: number;
  /**
   * Maximum n-gram size for keyword extraction
   */
  keyword_max_ngram_size: number;
  /**
   * Language of the documents: 'de', 'en', ...
   */
  language: Language;
};
