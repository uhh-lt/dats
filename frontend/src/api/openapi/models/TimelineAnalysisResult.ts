/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TimelineAnalysisResult = {
    /**
     * The name of the concept.
     */
    concept_name: string;
    /**
     * The date of document.
     */
    date: string;
    /**
     * The similar sentence.
     */
    sentence: string;
    /**
     * The similarity score.
     */
    score: number;
    /**
     * The id of the SourceDocument the similar sentence belongs to.
     */
    sdoc_id: number;
    /**
     * The context of the similar sentence.
     */
    context: string;
};

