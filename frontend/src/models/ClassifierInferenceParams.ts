/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClassifierInferenceParams = {
  /**
   * The type of the Classifier Task
   */
  task_type: string;
  /**
   * ID of the model to use for inference
   */
  classifier_id: number;
  /**
   * List of SourceDocument IDs to apply the classifier on
   */
  sdoc_ids: Array<number>;
  /**
   * Virtual annotator of the project the span or sentence annotations are written into. Required for span and sentence classifiers, unused for document classifiers (they assign tags).
   */
  annotator_id?: number | null;
  /**
   * Delete the existing span/sentence annotations of the virtual annotator or the tags before creating new ones
   */
  delete_existing_work: boolean;
};
