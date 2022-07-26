/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Data } from '../models/Data';
import type { IntValue } from '../models/IntValue';
import type { Patch } from '../models/Patch';
import type { PatchCreate } from '../models/PatchCreate';
import type { User } from '../models/User';
import type { UserCreate } from '../models/UserCreate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class DefaultService {

    /**
     * Get Users
     * @param offset
     * @param limit
     * @returns User Successful Response
     * @throws ApiError
     */
    public static getUsersUsersGet(
        offset?: number,
        limit: number = 100,
    ): CancelablePromise<Array<User>> {
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
     * @returns User Successful Response
     * @throws ApiError
     */
    public static createUserUsersPost(
        requestBody: UserCreate,
    ): CancelablePromise<User> {
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
     * @returns User Successful Response
     * @throws ApiError
     */
    public static getUserUsersUserIdGet(
        userId: number,
    ): CancelablePromise<User> {
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
     * @returns Patch Successful Response
     * @throws ApiError
     */
    public static getPatchesPatchesGet(
        offset?: number,
        limit: number = 100,
    ): CancelablePromise<Array<Patch>> {
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
     * @returns Patch Successful Response
     * @throws ApiError
     */
    public static createPatchPatchesPost(
        requestBody: PatchCreate,
    ): CancelablePromise<Patch> {
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
     * @returns Patch Successful Response
     * @throws ApiError
     */
    public static getPatchPatchesPatchIdGet(
        patchId: number,
    ): CancelablePromise<Patch> {
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
     * @returns Data Successful Response
     * @throws ApiError
     */
    public static getDataOfUserUsersUserIdDataGet(
        userId: number,
    ): CancelablePromise<Data> {
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
     * @returns Data Successful Response
     * @throws ApiError
     */
    public static getDataDataPatchIdGet(
        patchId: number,
    ): CancelablePromise<Data> {
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
     * @returns IntValue Successful Response
     * @throws ApiError
     */
    public static getIdOfDataOfUserUsersUserIdDataIdGet(
        userId: number,
    ): CancelablePromise<IntValue> {
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
     * @param ifMatch
     * @returns IntValue Successful Response
     * @throws ApiError
     */
    public static putIdOfDataOfUserUsersUserIdDataIdPut(
        userId: number,
        requestBody: IntValue,
        ifMatch?: number,
    ): CancelablePromise<IntValue> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/users/{user_id}/data/id',
            path: {
                'user_id': userId,
            },
            headers: {
                'if-match': ifMatch,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
