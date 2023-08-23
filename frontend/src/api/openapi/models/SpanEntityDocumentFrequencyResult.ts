/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SpanEntityDocumentFrequency } from './SpanEntityDocumentFrequency';

export type SpanEntityDocumentFrequencyResult = {
    /**
     * Map of Code ID to SpanEntityDocumentFrequency
     */
    stats: Record<string, Array<SpanEntityDocumentFrequency>>;
};

