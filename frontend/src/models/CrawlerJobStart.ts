/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProcessingSettings } from "./ProcessingSettings";
export type CrawlerJobStart = {
  /**
   * Processing settings
   */
  settings: ProcessingSettings;
  /**
   * List of URLs to crawl.
   */
  urls: Array<string>;
};
