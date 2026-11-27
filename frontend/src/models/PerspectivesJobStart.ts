/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "./AddMissingDocsToAspectParams";
import type { ChangeClusterParams } from "./ChangeClusterParams";
import type { CreateClusterWithNameParams } from "./CreateClusterWithNameParams";
import type { CreateClusterWithSdocsParams } from "./CreateClusterWithSdocsParams";
import type { MergeClustersParams } from "./MergeClustersParams";
import type { RecomputeClusterTitleAndDescriptionParams } from "./RecomputeClusterTitleAndDescriptionParams";
import type { RefineModelParams } from "./RefineModelParams";
import type { RemoveClusterParams } from "./RemoveClusterParams";
import type { ResetModelParams } from "./ResetModelParams";
import type { SplitClusterParams } from "./SplitClusterParams";
/**
 * The body of a PerspectivesJob start: the aspect and the parameters.
 */
export type PerspectivesJobStart = {
  /**
   * ID of the aspect the PerspectivesJob works on
   */
  aspect_id: number;
  /**
   * Parameters for the PerspectivesJob. The type depends on the PerspectivesJobType.
   */
  parameters:
    | AddMissingDocsToAspectParams
    | CreateClusterWithNameParams
    | CreateClusterWithSdocsParams
    | RemoveClusterParams
    | MergeClustersParams
    | SplitClusterParams
    | ChangeClusterParams
    | RefineModelParams
    | ResetModelParams
    | RecomputeClusterTitleAndDescriptionParams;
};
