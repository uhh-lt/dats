/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProcessingSettings } from "./ProcessingSettings";
export type CrawlerJobInput_Input = {
  /**
   * The ID of the Project to import the crawled data.
   */
  project_id: number;
  /**
   * Processing settings
   */
  settings: ProcessingSettings;
  /**
   * List of URLs to crawl.
   */
  urls: Array<string>;
};
