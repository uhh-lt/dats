/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedbackCreate } from "../models/FeedbackCreate";
import type { FeedbackRead } from "../models/FeedbackRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class FeedbackService {
  /**
   * Returns all Feedback
   * Returns the Metadata with the given ID.
   * @returns FeedbackRead Successful Response
   * @throws ApiError
   */
  public static getAll(): CancelablePromise<Array<FeedbackRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/feedback",
    });
  }

  /**
   * Creates new Feedback
   * Creates a new Feedback and returns it with the generated ID.
   * @returns FeedbackRead Successful Response
   * @throws ApiError
   */
  public static createFeedback({ requestBody }: { requestBody: FeedbackCreate }): CancelablePromise<FeedbackRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/feedback",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Feedback
   * Returns the Feedback with the given ID.
   * @returns FeedbackRead Successful Response
   * @throws ApiError
   */
  public static getById({ feedbackId }: { feedbackId: string }): CancelablePromise<FeedbackRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/feedback/{feedback_id}",
      path: {
        feedback_id: feedbackId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Reply to the Feedback
   * Sends an e-mail to the User that created the Feedback with the given message.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static replyTo({ feedbackId, message }: { feedbackId: string; message: string }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/feedback/reply_to/{feedback_id}",
      path: {
        feedback_id: feedbackId,
      },
      query: {
        message: message,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
