/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "../models/AttachedObjectType";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MemoGenerationService {
  /**
   * Generates a 1–2 sentence memo suggestion using LLM based on the attached object
   * @returns string Successful Response
   * @throws ApiError
   */
  public static generateMemoSuggestion({
    attachedObjId,
    attachedObjType,
  }: {
    attachedObjId: number;
    attachedObjType: AttachedObjectType;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo_generation/generate_suggestion/{attached_obj_type}/{attached_obj_id}",
      path: {
        attached_obj_id: attachedObjId,
        attached_obj_type: attachedObjType,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
