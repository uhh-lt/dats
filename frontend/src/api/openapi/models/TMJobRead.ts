/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "./AddMissingDocsToAspectParams";
import type { AddTopicParams } from "./AddTopicParams";
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { CreateAspectParams } from "./CreateAspectParams";
import type { MergeTopicsParams } from "./MergeTopicsParams";
import type { RefineTopicModelParams } from "./RefineTopicModelParams";
import type { RemoveTopicParams } from "./RemoveTopicParams";
import type { ResetTopicModelParams } from "./ResetTopicModelParams";
import type { SplitTopicParams } from "./SplitTopicParams";
import type { TMJobType } from "./TMJobType";
export type TMJobRead = {
  /**
   * Status message of the TMJob
   */
  status_msg: string;
  /**
   * Type of the TMJob
   */
  tm_job_type: TMJobType;
  /**
   * Parameters for the TMJob. The type depends on the TMJobType.
   */
  parameters:
    | CreateAspectParams
    | AddMissingDocsToAspectParams
    | AddTopicParams
    | RemoveTopicParams
    | MergeTopicsParams
    | SplitTopicParams
    | RefineTopicModelParams
    | ResetTopicModelParams;
  /**
   * Status of the BackgroundJob
   */
  status?: BackgroundJobStatus;
  /**
   * UUID of the BackgroundJob
   */
  id: string;
  /**
   * The ID of the Project for which the BackgroundJob is executed.
   */
  project_id: number;
  /**
   * Created timestamp of the BackgroundJob
   */
  created: string;
  /**
   * Updated timestamp of the BackgroundJob
   */
  updated: string;
};
