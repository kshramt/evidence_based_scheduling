/* tslint:disable */
/* eslint-disable */
/**
 * FastAPI
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import {
    EtagPathHeader,
    EtagPathHeaderFromJSON,
    EtagPathHeaderFromJSONTyped,
    EtagPathHeaderToJSON,
} from './EtagPathHeader';
import {
    IntValue,
    IntValueFromJSON,
    IntValueFromJSONTyped,
    IntValueToJSON,
} from './IntValue';

/**
 * 
 * @export
 * @interface HBEtagPathHeaderIntValue
 */
export interface HBEtagPathHeaderIntValue {
    /**
     * 
     * @type {EtagPathHeader}
     * @memberof HBEtagPathHeaderIntValue
     */
    header: EtagPathHeader;
    /**
     * 
     * @type {IntValue}
     * @memberof HBEtagPathHeaderIntValue
     */
    body: IntValue;
}

export function HBEtagPathHeaderIntValueFromJSON(json: any): HBEtagPathHeaderIntValue {
    return HBEtagPathHeaderIntValueFromJSONTyped(json, false);
}

export function HBEtagPathHeaderIntValueFromJSONTyped(json: any, ignoreDiscriminator: boolean): HBEtagPathHeaderIntValue {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'header': EtagPathHeaderFromJSON(json['header']),
        'body': IntValueFromJSON(json['body']),
    };
}

export function HBEtagPathHeaderIntValueToJSON(value?: HBEtagPathHeaderIntValue | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'header': EtagPathHeaderToJSON(value.header),
        'body': IntValueToJSON(value.body),
    };
}

