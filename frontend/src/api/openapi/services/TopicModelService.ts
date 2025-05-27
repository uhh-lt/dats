/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMissingDocsToAspectParams } from "../models/AddMissingDocsToAspectParams";
import type { AddTopicParams } from "../models/AddTopicParams";
import type { AspectCreate } from "../models/AspectCreate";
import type { AspectRead } from "../models/AspectRead";
import type { AspectUpdate } from "../models/AspectUpdate";
import type { MergeTopicsParams } from "../models/MergeTopicsParams";
import type { RefineTopicModelParams } from "../models/RefineTopicModelParams";
import type { RemoveTopicParams } from "../models/RemoveTopicParams";
import type { ResetTopicModelParams } from "../models/ResetTopicModelParams";
import type { SplitTopicParams } from "../models/SplitTopicParams";
import type { TMJobRead } from "../models/TMJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TopicModelService {
  /**
   * Starts the TMJob for the given Parameters. If a job is already running, this will raise an error.
   * @returns TMJobRead Successful Response
   * @throws ApiError
   */
  public static startTmJob({
    aspectId,
    requestBody,
  }: {
    aspectId: number;
    requestBody:
      | AddMissingDocsToAspectParams
      | AddTopicParams
      | RemoveTopicParams
      | MergeTopicsParams
      | SplitTopicParams
      | RefineTopicModelParams
      | ResetTopicModelParams;
  }): CancelablePromise<TMJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/topic_model/job/{aspect_id}",
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
   * Returns the TMJob for the given ID if it exists
   * @returns TMJobRead Successful Response
   * @throws ApiError
   */
  public static getTmJob({ tmJobId }: { tmJobId: string }): CancelablePromise<TMJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/topic_model/job/{tm_job_id}",
      path: {
        tm_job_id: tmJobId,
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
      url: "/topic_model/aspect",
      body: requestBody,
      mediaType: "application/json",
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
      url: "/topic_model/aspect/{aspect_id}",
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
      url: "/topic_model/aspect/{aspect_id}",
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
      url: "/topic_model/aspect/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Accept the label of the provided SourceDocuments (by ID).
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static acceptLabel({
    aspectId,
    requestBody,
  }: {
    aspectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/topic_model/label_accept/{aspect_id}",
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
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static revertLabel({
    aspectId,
    requestBody,
  }: {
    aspectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/topic_model/label_revert/{aspect_id}",
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
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static visualizeDocuments({ aspectId }: { aspectId: number }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/topic_model/visualize_documents/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns data for visualizing the topics of the given aspect.
   * @returns AspectRead Successful Response
   * @throws ApiError
   */
  public static visualizeTopics({ aspectId }: { aspectId: number }): CancelablePromise<AspectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/topic_model/visualize_topics/{aspect_id}",
      path: {
        aspect_id: aspectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
