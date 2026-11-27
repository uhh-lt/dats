/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AspectCreate } from "@models/AspectCreate";
import type { AspectRead } from "@models/AspectRead";
import type { AspectUpdate } from "@models/AspectUpdate";
import type { Body_perspectives_accept_labels } from "@models/Body_perspectives_accept_labels";
import type { Body_perspectives_revert_labels } from "@models/Body_perspectives_revert_labels";
import type { Body_perspectives_visualize_documents } from "@models/Body_perspectives_visualize_documents";
import type { ClusterRead } from "@models/ClusterRead";
import type { ClusterUpdate } from "@models/ClusterUpdate";
import type { PerspectivesClusterSimilarities } from "@models/PerspectivesClusterSimilarities";
import type { PerspectivesVisualization } from "@models/PerspectivesVisualization";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class PerspectivesService {
  /**
   * Creates a new Aspect
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static create({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Aspects of the Project
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<AspectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/perspectives/aspects",
      path: {
        project_id: projectId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Aspect with the given ID.
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static updateById({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the Aspect with the given ID.
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the clusters for the given SourceDocument (sdoc_id) in the specified Aspect (aspect_id).
   * @returns ClusterRead Successful Response
   * @throws ApiError
   */
  public static getClusters({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Cluster's name and description.
   * @returns ClusterRead Successful Response
   * @throws ApiError
   */
  public static updateCluster({
    projectId,
    aspectId,
    clusterId,
    requestBody,
  }: {
    projectId: number;
    aspectId: number;
    clusterId: number;
    requestBody: ClusterUpdate;
  }): CancelablePromise<ClusterRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/perspectives/aspects/{aspect_id}/clusters/{cluster_id}",
      path: {
        project_id: projectId,
        aspect_id: aspectId,
        cluster_id: clusterId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Accept the label of the provided SourceDocuments (by ID) and return the updated visualization.
   * @returns PerspectivesVisualization Successful Response
   * @throws ApiError
   */
  public static acceptLabels({
    projectId,
    aspectId,
    searchQuery,
    requestBody,
  }: {
    projectId: number;
    aspectId: number;
    searchQuery: string;
    requestBody: Body_perspectives_accept_labels;
  }): CancelablePromise<PerspectivesVisualization> {
    return __request(OpenAPI, {
      method: "PATCH",
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Reverts the label of the provided SourceDocuments (by ID) and return the updated visualization.
   * @returns PerspectivesVisualization Successful Response
   * @throws ApiError
   */
  public static revertLabels({
    projectId,
    aspectId,
    searchQuery,
    requestBody,
  }: {
    projectId: number;
    aspectId: number;
    searchQuery: string;
    requestBody: Body_perspectives_revert_labels;
  }): CancelablePromise<PerspectivesVisualization> {
    return __request(OpenAPI, {
      method: "PATCH",
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
}
