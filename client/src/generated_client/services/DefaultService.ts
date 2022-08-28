/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { create_patchReq } from '../models/create_patchReq';
import type { create_patchResNoMatchingParent } from '../models/create_patchResNoMatchingParent';
import type { create_patchResOk } from '../models/create_patchResOk';
import type { create_userReq } from '../models/create_userReq';
import type { create_userRes } from '../models/create_userRes';
import type { get_data_of_userRes } from '../models/get_data_of_userRes';
import type { get_dataRes } from '../models/get_dataRes';
import type { get_id_of_data_of_userRes } from '../models/get_id_of_data_of_userRes';
import type { get_patchRes } from '../models/get_patchRes';
import type { get_userRes } from '../models/get_userRes';
import type { put_id_of_data_of_userReqWithIfMatch } from '../models/put_id_of_data_of_userReqWithIfMatch';
import type { put_id_of_data_of_userReqWithoutIfMatch } from '../models/put_id_of_data_of_userReqWithoutIfMatch';
import type { put_id_of_data_of_userRes200 } from '../models/put_id_of_data_of_userRes200';
import type { put_id_of_data_of_userRes412 } from '../models/put_id_of_data_of_userRes412';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class DefaultService {

    /**
     * Create User
     * @param requestBody
     * @returns create_userRes Successful Response
     * @throws ApiError
     */
    public static createUserUsersPost(
        requestBody: create_userReq,
    ): CancelablePromise<create_userRes> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/users',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get User
     * @param userId
     * @returns get_userRes Successful Response
     * @throws ApiError
     */
    public static getUserUsersUserIdGet(
        userId: number,
    ): CancelablePromise<get_userRes> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Patch
     * @param patchId
     * @returns get_patchRes Successful Response
     * @throws ApiError
     */
    public static getPatchPatchesPatchIdGet(
        patchId: number,
    ): CancelablePromise<get_patchRes> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patches/{patch_id}',
            path: {
                'patch_id': patchId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Patch
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static createPatchPatchesPost(
        requestBody: create_patchReq,
    ): CancelablePromise<(create_patchResOk | create_patchResNoMatchingParent)> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patches',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Data Of User
     * @param userId
     * @returns get_data_of_userRes Successful Response
     * @throws ApiError
     */
    public static getDataOfUserUsersUserIdDataGet(
        userId: number,
    ): CancelablePromise<get_data_of_userRes> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/{user_id}/data',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Data
     * @param patchId
     * @returns get_dataRes Successful Response
     * @throws ApiError
     */
    public static getDataDataPatchIdGet(
        patchId: number,
    ): CancelablePromise<get_dataRes> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/{patch_id}',
            path: {
                'patch_id': patchId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Id Of Data Of User
     * @param userId
     * @returns get_id_of_data_of_userRes Successful Response
     * @throws ApiError
     */
    public static getIdOfDataOfUserUsersUserIdDataIdGet(
        userId: number,
    ): CancelablePromise<get_id_of_data_of_userRes> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/{user_id}/data/id',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Put Id Of Data Of User
     * @param userId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static putIdOfDataOfUserUsersUserIdDataIdPut(
        userId: number,
        requestBody: (put_id_of_data_of_userReqWithIfMatch | put_id_of_data_of_userReqWithoutIfMatch),
    ): CancelablePromise<(put_id_of_data_of_userRes412 | put_id_of_data_of_userRes200)> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/users/{user_id}/data/id',
            path: {
                'user_id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Healthz
     * @returns void
     * @throws ApiError
     */
    public static getHealthzHealthzGet(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/healthz',
        });
    }

}
