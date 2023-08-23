/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class GeneralService {

    /**
     * Heartbeat
     * @returns any Successful Response
     * @throws ApiError
     */
    public static heartbeat(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/heartbeat',
        });
    }

    /**
     * Root To Docs
     * Redirection to /docs
     * @returns any Successful Response
     * @throws ApiError
     */
    public static rootToDocs(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
        });
    }

}
