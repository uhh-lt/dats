/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTACreate } from "../models/COTACreate";
import type { COTARead } from "../models/COTARead";
import type { COTARefinementJobInput } from "../models/COTARefinementJobInput";
import type { COTARefinementJobRead } from "../models/COTARefinementJobRead";
import type { COTASentenceID } from "../models/COTASentenceID";
import type { COTAUpdate } from "../models/COTAUpdate";
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
  public static create({ requestBody }: { requestBody: COTACreate }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/cota",
      body: requestBody,
      mediaType: "application/json",
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
  public static getById({ cotaId }: { cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/cota/{cota_id}",
      path: {
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
    cotaId,
    requestBody,
  }: {
    cotaId: number;
    requestBody: COTAUpdate;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/cota/{cota_id}",
      path: {
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
  public static deleteById({ cotaId }: { cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/cota/{cota_id}",
      path: {
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns COTAs of the Project
   * Returns the COTA of the Project with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<COTARead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/cota/project/{project_id}",
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
  public static duplicateById({ cotaId }: { cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/cota/duplicate/{cota_id}",
      path: {
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
    cotaId,
    requestBody,
    conceptId,
  }: {
    cotaId: number;
    requestBody: Array<COTASentenceID>;
    conceptId?: string | null;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/cota/annotate/{cota_id}",
      path: {
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
    cotaId,
    requestBody,
  }: {
    cotaId: number;
    requestBody: Array<COTASentenceID>;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/cota/remove/{cota_id}",
      path: {
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
  public static resetCota({ cotaId }: { cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/cota/reset/{cota_id}",
      path: {
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Refines the ConceptOverTimeAnalysis
   * Refines the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static refineCota({ requestBody }: { requestBody: COTARefinementJobInput }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/cota/refine",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the COTA Refinement Job for the given ID
   * Returns the COTA Refinement Job for the given ID if it exists
   * @returns COTARefinementJobRead Successful Response
   * @throws ApiError
   */
  public static getCotaJob({ cotaJobId }: { cotaJobId: string }): CancelablePromise<COTARefinementJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/cota/refine/{cota_job_id}",
      path: {
        cota_job_id: cotaJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
