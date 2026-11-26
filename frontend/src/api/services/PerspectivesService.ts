/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "@models/AddMissingDocsToAspectParams";
import type { AspectCreate } from "@models/AspectCreate";
import type { AspectRead } from "@models/AspectRead";
import type { AspectUpdate } from "@models/AspectUpdate";
import type { Body_perspectives_accept_label } from "@models/Body_perspectives_accept_label";
import type { Body_perspectives_revert_label } from "@models/Body_perspectives_revert_label";
import type { Body_perspectives_visualize_documents } from "@models/Body_perspectives_visualize_documents";
import type { ChangeClusterParams } from "@models/ChangeClusterParams";
import type { ClusterRead } from "@models/ClusterRead";
import type { ClusterUpdate } from "@models/ClusterUpdate";
import type { CreateClusterWithNameParams } from "@models/CreateClusterWithNameParams";
import type { CreateClusterWithSdocsParams } from "@models/CreateClusterWithSdocsParams";
import type { MergeClustersParams } from "@models/MergeClustersParams";
import type { PerspectivesClusterSimilarities } from "@models/PerspectivesClusterSimilarities";
import type { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import type { PerspectivesVisualization } from "@models/PerspectivesVisualization";
import type { RecomputeClusterTitleAndDescriptionParams } from "@models/RecomputeClusterTitleAndDescriptionParams";
import type { RefineModelParams } from "@models/RefineModelParams";
import type { RemoveClusterParams } from "@models/RemoveClusterParams";
import type { ResetModelParams } from "@models/ResetModelParams";
import type { SplitClusterParams } from "@models/SplitClusterParams";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class PerspectivesService {
  /**
   * Starts the PerspectivesJob of the Aspect (aspect_id) for the given Parameters. If a job is already running, this will raise an error.
   * @returns PerspectivesJobRead Successful Response
   * @throws ApiError
   */
  public static startPerspectivesJob({
    projectId,
    aspectId,
    requestBody,
  }: {
    projectId: number;
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
      url: "/projects/{project_id}/jobs/perspectives",
      path: {
        project_id: projectId,
      },
      query: {
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
   * Creates a new Aspect
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static createAspect({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: AspectCreate;
  }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/perspectives/aspects",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Aspects of the Project
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static getAllAspects({ projectId }: { projectId: number }): CancelablePromise<Array<AspectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/perspectives/aspects",
      path: {
        project_id: projectId,
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
  public static getById({
    projectId,
    aspectId,
  }: {
    projectId: number;
    aspectId: number;
  }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}",
      path: {
        project_id: projectId,
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
    projectId,
    aspectId,
    requestBody,
  }: {
    projectId: number;
    aspectId: number;
    requestBody: AspectUpdate;
  }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}",
      path: {
        project_id: projectId,
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
  public static removeAspectById({
    projectId,
    aspectId,
  }: {
    projectId: number;
    aspectId: number;
  }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}",
      path: {
        project_id: projectId,
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the URL of the map thumbnail of the Aspect (relative to /content/), None until it is computed.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getMapThumbnailUrl({
    projectId,
    aspectId,
  }: {
    projectId: number;
    aspectId: number;
  }): CancelablePromise<string | null> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/map-thumbnail-url",
      path: {
        project_id: projectId,
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
    projectId,
    aspectId,
    sdocId,
  }: {
    projectId: number;
    aspectId: number;
    sdocId: number;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/source-documents/{sdoc_id}",
      path: {
        project_id: projectId,
        aspect_id: aspectId,
        sdoc_id: sdocId,
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
    projectId,
    aspectId,
    sdocId,
  }: {
    projectId: number;
    aspectId: number;
    sdocId: number;
  }): CancelablePromise<Array<ClusterRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/clusters",
      path: {
        project_id: projectId,
        aspect_id: aspectId,
      },
      query: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Cluster's name and description.
   * @returns ClusterRead Successful Response
   * @throws ApiError
   */
  public static updateClusterDetails({
    projectId,
    clusterId,
    requestBody,
  }: {
    projectId: number;
    clusterId: number;
    requestBody: ClusterUpdate;
  }): CancelablePromise<ClusterRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/perspectives/clusters/{cluster_id}",
      path: {
        project_id: projectId,
        cluster_id: clusterId,
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
    projectId,
    aspectId,
    searchQuery,
    requestBody,
  }: {
    projectId: number;
    aspectId: number;
    searchQuery: string;
    requestBody: Body_perspectives_visualize_documents;
  }): CancelablePromise<PerspectivesVisualization> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/visualize",
      path: {
        project_id: projectId,
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
   * Accept the label of the provided SourceDocuments (by ID) and return the updated visualization.
   * @returns PerspectivesVisualization Successful Response
   * @throws ApiError
   */
  public static acceptLabel({
    projectId,
    aspectId,
    searchQuery,
    requestBody,
  }: {
    projectId: number;
    aspectId: number;
    searchQuery: string;
    requestBody: Body_perspectives_accept_label;
  }): CancelablePromise<PerspectivesVisualization> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/accept-labels",
      path: {
        project_id: projectId,
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
   * Reverts the label of the provided SourceDocuments (by ID) and return the updated visualization.
   * @returns PerspectivesVisualization Successful Response
   * @throws ApiError
   */
  public static revertLabel({
    projectId,
    aspectId,
    searchQuery,
    requestBody,
  }: {
    projectId: number;
    aspectId: number;
    searchQuery: string;
    requestBody: Body_perspectives_revert_label;
  }): CancelablePromise<PerspectivesVisualization> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/revert-labels",
      path: {
        project_id: projectId,
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
    projectId,
    aspectId,
  }: {
    projectId: number;
    aspectId: number;
  }): CancelablePromise<PerspectivesClusterSimilarities> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/cluster-similarities",
      path: {
        project_id: projectId,
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
