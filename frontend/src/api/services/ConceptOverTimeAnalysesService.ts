/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotateSentencesRequest } from "@models/AnnotateSentencesRequest";
import type { ConceptOverTimeAnalysisCreate } from "@models/ConceptOverTimeAnalysisCreate";
import type { ConceptOverTimeAnalysisRead } from "@models/ConceptOverTimeAnalysisRead";
import type { ConceptOverTimeAnalysisUpdate } from "@models/ConceptOverTimeAnalysisUpdate";
import type { COTARefinementHyperparameters } from "@models/COTARefinementHyperparameters";
import type { RemoveSentencesRequest } from "@models/RemoveSentencesRequest";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ConceptOverTimeAnalysesService {
  /**
   * Creates an ConceptOverTimeAnalysis
   * Creates an ConceptOverTimeAnalysis
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ConceptOverTimeAnalysisCreate;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/concept-over-time-analyses",
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
   * Returns COTAs of the Project
   * Returns the COTAs of the Project
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ConceptOverTimeAnalysisRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/concept-over-time-analyses",
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
   * Duplicates the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static duplicate({
    projectId,
    cotaId,
  }: {
    projectId: number;
    cotaId: number;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/duplicate",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
   * Returns the ConceptOverTimeAnalysis
   * Returns the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    cotaId,
  }: {
    projectId: number;
    cotaId: number;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
   * Updates the ConceptOverTimeAnalysis
   * Updates the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    cotaId,
    requestBody,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: ConceptOverTimeAnalysisUpdate;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
   * Removes the ConceptOverTimeAnalysis
   * Removes the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    cotaId,
  }: {
    projectId: number;
    cotaId: number;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
   * Annotate (multiple) COTASentences
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static annotateSentences({
    projectId,
    cotaId,
    requestBody,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: AnnotateSentencesRequest;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/annotate-sentences",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
   * Remove (multiple) COTASentences from the search space
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static removeSentences({
    projectId,
    cotaId,
    requestBody,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: RemoveSentencesRequest;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/remove-sentences",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
   * Resets the ConceptOverTimeAnalysis
   * Resets the ConceptOverTimeAnalysis deleting model, embeddings, refinement jobs and resetting the search space
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static reset({
    projectId,
    cotaId,
  }: {
    projectId: number;
    cotaId: number;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/reset",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
   * Refines the ConceptOverTimeAnalysis
   * Starts the refinement job of the ConceptOverTimeAnalysis with the given ID; read the job at /jobs/cota-refinement
   * @returns ConceptOverTimeAnalysisRead Successful Response
   * @throws ApiError
   */
  public static refine({
    projectId,
    cotaId,
    requestBody,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: COTARefinementHyperparameters;
  }): CancelablePromise<ConceptOverTimeAnalysisRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/refine",
      path: {
        project_id: projectId,
        cota_id: cotaId,
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
}
