/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CrawlerJobParameters } from "./CrawlerJobParameters";
import type { CrawlerJobStatus } from "./CrawlerJobStatus";

export type CrawlerJobRead = {
  /**
   * Status of the CrawlerJob
   */
  status?: CrawlerJobStatus;
  /**
   * ID of the CrawlerJob
   */
  id: string;
  /**
   * The parameters of the export job that defines what to export!
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
   * Path to the ZIP that contains the data of the CrawlerJob
   */
  crawled_data_zip_path?: string;
  /**
   * Created timestamp of the CrawlerJob
   */
  created: string;
};
