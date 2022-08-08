/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Patch } from './Patch';

export type create_patchResOk = {
    status: 'ok';
    etag: number;
    path: string;
    body: Patch;
};

