/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "../models/AddMissingDocsToAspectParams";
import type { AspectCreate } from "../models/AspectCreate";
import type { AspectRead } from "../models/AspectRead";
import type { AspectUpdate } from "../models/AspectUpdate";
import type { Body_perspectives_visualize_documents } from "../models/Body_perspectives_visualize_documents";
import type { ChangeClusterParams } from "../models/ChangeClusterParams";
import type { ClusterRead } from "../models/ClusterRead";
import type { CreateClusterWithNameParams } from "../models/CreateClusterWithNameParams";
import type { CreateClusterWithSdocsParams } from "../models/CreateClusterWithSdocsParams";
import type { MergeClustersParams } from "../models/MergeClustersParams";
import type { PerspectivesClusterSimilarities } from "../models/PerspectivesClusterSimilarities";
import type { PerspectivesJobRead } from "../models/PerspectivesJobRead";
import type { PerspectivesVisualization } from "../models/PerspectivesVisualization";
import type { RecomputeClusterTitleAndDescriptionParams } from "../models/RecomputeClusterTitleAndDescriptionParams";
import type { RefineModelParams } from "../models/RefineModelParams";
import type { RemoveClusterParams } from "../models/RemoveClusterParams";
import type { ResetModelParams } from "../models/ResetModelParams";
import type { SplitClusterParams } from "../models/SplitClusterParams";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class PerspectivesService {
  /**
   * Starts the PerspectivesJob for the given Parameters. If a job is already running, this will raise an error.
   * @returns PerspectivesJobRead Successful Response
   * @throws ApiError
   */
  public static startPerspectivesJob({
    aspectId,
    requestBody,
  }: {
    aspectId: number;
    requestBody:
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
  }): CancelablePromise<PerspectivesJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/perspectives/job/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the PerspectivesJob for the given ID if it exists
   * @returns PerspectivesJobRead Successful Response
   * @throws ApiError
   */
  public static getPerspectivesJob({
    perspectivesJobId,
  }: {
    perspectivesJobId: string;
  }): CancelablePromise<PerspectivesJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/perspectives/job/{perspectives_job_id}",
      path: {
        perspectives_job_id: perspectivesJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a new Aspect
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static createAspect({ requestBody }: { requestBody: AspectCreate }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/perspectives/aspect",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Aspects of the Project with the given ID if it exists
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static getAllAspects({ projId }: { projId: number }): CancelablePromise<Array<AspectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/perspectives/project/{proj_id}/aspects",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Aspect with the given ID.
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static getById({ aspectId }: { aspectId: number }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/perspectives/aspect/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Aspect with the given ID.
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static updateAspectById({
    aspectId,
    requestBody,
  }: {
    aspectId: number;
    requestBody: AspectUpdate;
  }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/perspectives/aspect/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the Aspect with the given ID.
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static removeAspectById({ aspectId }: { aspectId: number }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/perspectives/aspect/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Document Aspect Content for the given IDs.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getDocaspectById({
    aspectId,
    sdocId,
  }: {
    aspectId: number;
    sdocId: number;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/perspectives/aspect/{aspect_id}/sdoc/{sdoc_id}",
      path: {
        aspect_id: aspectId,
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Accept the label of the provided SourceDocuments (by ID).
   * @returns number Successful Response
   * @throws ApiError
   */
  public static acceptLabel({
    aspectId,
    requestBody,
  }: {
    aspectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/perspectives/label_accept/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Reverts the label of the provided SourceDocuments (by ID).
   * @returns number Successful Response
   * @throws ApiError
   */
  public static revertLabel({
    aspectId,
    requestBody,
  }: {
    aspectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/perspectives/label_revert/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns data for visualizing the documents of the given aspect.
   * @returns PerspectivesVisualization Successful Response
   * @throws ApiError
   */
  public static visualizeDocuments({
    aspectId,
    searchQuery,
    requestBody,
  }: {
    aspectId: number;
    searchQuery: string;
    requestBody: Body_perspectives_visualize_documents;
  }): CancelablePromise<PerspectivesVisualization> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/perspectives/visualize_documents/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      query: {
        search_query: searchQuery,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns data for visualizing the cluster similarities of the given aspect.
   * @returns PerspectivesClusterSimilarities Successful Response
   * @throws ApiError
   */
  public static getClusterSimilarities({
    aspectId,
  }: {
    aspectId: number;
  }): CancelablePromise<PerspectivesClusterSimilarities> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/perspectives/cluster_similarities/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns data for visualizing the clusters of the given aspect.
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static visualizeClusters({ aspectId }: { aspectId: number }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/perspectives/visualize_clusters/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the clusters for the given SourceDocument (sdoc_id) in the specified Aspect (aspect_id).
   * @returns ClusterRead Successful Response
   * @throws ApiError
   */
  public static getClustersForSdoc({
    aspectId,
    sdocId,
  }: {
    aspectId: number;
    sdocId: number;
  }): CancelablePromise<Array<ClusterRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/perspectives/clusters/{aspect_id}/sdoc/{sdoc_id}",
      path: {
        aspect_id: aspectId,
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
