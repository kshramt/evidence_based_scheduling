/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { create_patchReq } from '../models/create_patchReq';
import type { create_patchRes } from '../models/create_patchRes';
import type { create_userReq } from '../models/create_userReq';
import type { create_userRes } from '../models/create_userRes';
import type { get_data_of_userRes } from '../models/get_data_of_userRes';
import type { get_id_of_data_of_userRes } from '../models/get_id_of_data_of_userRes';
import type { HB_EmptyHeader__list_api_schemas_Patch__ } from '../models/HB_EmptyHeader__list_api_schemas_Patch__';
import type { HB_EmptyHeader__list_api_schemas_User__ } from '../models/HB_EmptyHeader__list_api_schemas_User__';
import type { HB_EmptyHeader__Patch_ } from '../models/HB_EmptyHeader__Patch_';
import type { HB_EmptyHeader__User_ } from '../models/HB_EmptyHeader__User_';
import type { HB_EtagHeader__Data_ } from '../models/HB_EtagHeader__Data_';
import type { put_id_of_data_of_userReqWithIfMatch } from '../models/put_id_of_data_of_userReqWithIfMatch';
import type { put_id_of_data_of_userReqWithoutIfMatch } from '../models/put_id_of_data_of_userReqWithoutIfMatch';
import type { put_id_of_data_of_userRes200 } from '../models/put_id_of_data_of_userRes200';
import type { put_id_of_data_of_userRes412 } from '../models/put_id_of_data_of_userRes412';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class DefaultService {

    /**
     * Get Users
     * @param offset
     * @param limit
     * @returns HB_EmptyHeader__list_api_schemas_User__ Successful Response
     * @throws ApiError
     */
    public static getUsersUsersGet(
        offset?: number,
        limit: number = 100,
    ): CancelablePromise<HB_EmptyHeader__list_api_schemas_User__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users',
            query: {
                'offset': offset,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

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
     * @returns HB_EmptyHeader__User_ Successful Response
     * @throws ApiError
     */
    public static getUserUsersUserIdGet(
        userId: number,
    ): CancelablePromise<HB_EmptyHeader__User_> {
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
     * Get Patches
     * @param offset
     * @param limit
     * @returns HB_EmptyHeader__list_api_schemas_Patch__ Successful Response
     * @throws ApiError
     */
    public static getPatchesPatchesGet(
        offset?: number,
        limit: number = 100,
    ): CancelablePromise<HB_EmptyHeader__list_api_schemas_Patch__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patches',
            query: {
                'offset': offset,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Patch
     * @param requestBody
     * @returns create_patchRes Successful Response
     * @throws ApiError
     */
    public static createPatchPatchesPost(
        requestBody: create_patchReq,
    ): CancelablePromise<create_patchRes> {
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
     * Get Patch
     * @param patchId
     * @returns HB_EmptyHeader__Patch_ Successful Response
     * @throws ApiError
     */
    public static getPatchPatchesPatchIdGet(
        patchId: number,
    ): CancelablePromise<HB_EmptyHeader__Patch_> {
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
     * @returns HB_EtagHeader__Data_ Successful Response
     * @throws ApiError
     */
    public static getDataDataPatchIdGet(
        patchId: number,
    ): CancelablePromise<HB_EtagHeader__Data_> {
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

}
