/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { CrawlerJobParameters } from "./CrawlerJobParameters";
export type CrawlerJobRead = {
  /**
   * Status of the CrawlerJob
   */
  status?: BackgroundJobStatus;
  /**
   * ID of the CrawlerJob
   */
  id: string;
  /**
   * The parameters of the crawler job that defines what to crawl!
   */
  parameters: CrawlerJobParameters;
  /**
   * Internal temporary output directory for the crawled data.
   */
  output_dir: string;
  /**
   * Internal temporary output directory for the crawled images.
   */
  images_store_path: string;
  /**
   * Internal temporary output directory for the crawled videos.
   */
  videos_store_path: string;
  /**
   * Internal temporary output directory for the crawled audios.
   */
  audios_store_path: string;
  /**
   * Path to the ZIP that contains the data of the CrawlerJob
   */
  crawled_data_zip_path?: string | null;
  /**
   * Created timestamp of the CrawlerJob
   */
  created: string;
};
