/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "./AddMissingDocsToAspectParams";
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { ChangeClusterParams } from "./ChangeClusterParams";
import type { CreateAspectParams } from "./CreateAspectParams";
import type { CreateClusterWithNameParams } from "./CreateClusterWithNameParams";
import type { CreateClusterWithSdocsParams } from "./CreateClusterWithSdocsParams";
import type { MergeClustersParams } from "./MergeClustersParams";
import type { PerspectivesJobType } from "./PerspectivesJobType";
import type { RefineModelParams } from "./RefineModelParams";
import type { RemoveClusterParams } from "./RemoveClusterParams";
import type { ResetModelParams } from "./ResetModelParams";
import type { SplitClusterParams } from "./SplitClusterParams";
export type PerspectivesJobRead = {
  /**
   * Current step of the PerspectivesJob. Starts at 0 and increments with each major step.
   */
  step: number;
  /**
   * List of steps that the PerspectivesJob consists of. Each step is a string describing the action taken.
   */
  steps: Array<string>;
  /**
   * Status message of the PerspectivesJob
   */
  status_msg: string;
  /**
   * Type of the PerspectivesJob
   */
  perspectives_job_type: PerspectivesJobType;
  /**
   * ID of the aspect associated with the PerspectivesJob. -1 if not applicable.
   */
  aspect_id: number;
  /**
   * Parameters for the PerspectivesJob. The type depends on the PerspectivesJobType.
   */
  parameters:
    | CreateAspectParams
    | AddMissingDocsToAspectParams
    | CreateClusterWithNameParams
    | CreateClusterWithSdocsParams
    | RemoveClusterParams
    | MergeClustersParams
    | SplitClusterParams
    | ChangeClusterParams
    | RefineModelParams
    | ResetModelParams;
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
