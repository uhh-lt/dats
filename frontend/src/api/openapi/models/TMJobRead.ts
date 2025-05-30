/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "./AddMissingDocsToAspectParams";
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { ChangeTopicParams } from "./ChangeTopicParams";
import type { CreateAspectParams } from "./CreateAspectParams";
import type { CreateTopicWithNameParams } from "./CreateTopicWithNameParams";
import type { CreateTopicWithSdocsParams } from "./CreateTopicWithSdocsParams";
import type { MergeTopicsParams } from "./MergeTopicsParams";
import type { RefineTopicModelParams } from "./RefineTopicModelParams";
import type { RemoveTopicParams } from "./RemoveTopicParams";
import type { ResetTopicModelParams } from "./ResetTopicModelParams";
import type { SplitTopicParams } from "./SplitTopicParams";
import type { TMJobType } from "./TMJobType";
export type TMJobRead = {
  /**
   * Current step of the TMJob. Starts at 0 and increments with each major step.
   */
  step: number;
  /**
   * List of steps that the TMJob consists of. Each step is a string describing the action taken.
   */
  steps: Array<string>;
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
    | CreateTopicWithNameParams
    | CreateTopicWithSdocsParams
    | RemoveTopicParams
    | MergeTopicsParams
    | SplitTopicParams
    | ChangeTopicParams
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
