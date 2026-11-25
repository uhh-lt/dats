/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTACreate } from "@models/COTACreate";
import type { COTARead } from "@models/COTARead";
import type { COTARefinementHyperparameters } from "@models/COTARefinementHyperparameters";
import type { COTASentenceID } from "@models/COTASentenceID";
import type { COTAUpdate } from "@models/COTAUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ConceptOverTimeAnalysisService {
  /**
   * Creates an ConceptOverTimeAnalysis
   * Creates an ConceptOverTimeAnalysis
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: COTACreate;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/concept-over-time-analyses",
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
   * Returns COTAs of the Project
   * Returns the COTAs of the Project
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<COTARead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/concept-over-time-analyses",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Duplicates the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static duplicateById({
    projectId,
    cotaId,
  }: {
    projectId: number;
    cotaId: number;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/duplicate",
      path: {
        project_id: projectId,
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the ConceptOverTimeAnalysis
   * Returns the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static getById({ projectId, cotaId }: { projectId: number; cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}",
      path: {
        project_id: projectId,
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the ConceptOverTimeAnalysis
   * Updates the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    cotaId,
    requestBody,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: COTAUpdate;
  }): CancelablePromise<COTARead> {
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
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the ConceptOverTimeAnalysis
   * Removes the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static deleteById({ projectId, cotaId }: { projectId: number; cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}",
      path: {
        project_id: projectId,
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Annotate (multiple) COTASentences
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static annotateCotaSentence({
    projectId,
    cotaId,
    requestBody,
    conceptId,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: Array<COTASentenceID>;
    conceptId?: string | null;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/annotate",
      path: {
        project_id: projectId,
        cota_id: cotaId,
      },
      query: {
        concept_id: conceptId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Remove (multiple) COTASentences from the search space
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static removeCotaSentence({
    projectId,
    cotaId,
    requestBody,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: Array<COTASentenceID>;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/remove",
      path: {
        project_id: projectId,
        cota_id: cotaId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Resets the ConceptOverTimeAnalysis
   * Resets the ConceptOverTimeAnalysis deleting model, embeddings, refinement jobs and resetting the search space
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static resetCota({ projectId, cotaId }: { projectId: number; cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/concept-over-time-analyses/{cota_id}/reset",
      path: {
        project_id: projectId,
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Refines the ConceptOverTimeAnalysis
   * Starts the refinement job of the ConceptOverTimeAnalysis with the given ID; read the job at /jobs/cota-refinement
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static refineCota({
    projectId,
    cotaId,
    requestBody,
  }: {
    projectId: number;
    cotaId: number;
    requestBody: COTARefinementHyperparameters;
  }): CancelablePromise<COTARead> {
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
        422: `Validation Error`,
      },
    });
  }
}
