/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "./AddMissingDocsToAspectParams";
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
export type PerspectivesJobInput = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * ID of the aspect associated with the PerspectivesJob. -1 if not applicable.
   */
  aspect_id: number;
  /**
   * Type of the PerspectivesJob
   */
  perspectives_job_type: PerspectivesJobType;
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
};
