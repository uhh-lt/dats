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
   * Language of the documents: 'de', 'en', ...
   */
  language: Language;
  /**
   * Large Language Model to use for processing
   */
  model: string;
};
