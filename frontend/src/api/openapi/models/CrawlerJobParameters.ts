/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CrawlerJobParameters = {
  /**
   * The ID of the Project to import the crawled data.
   */
  project_id: number;
  /**
   * List of URLs to crawl.
   */
  urls: Array<string>;
};
