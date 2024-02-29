/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MemoRead } from "../models/MemoRead";
import type { MemoUpdate } from "../models/MemoUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MemoService {
  /**
   * Returns the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getById({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    memoId,
    requestBody,
  }: {
    memoId: number;
    requestBody: MemoUpdate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
