import { ClassifierModel } from "@models/ClassifierModel";

/**
 * User-facing label for the units of a classifier model,
 * e.g. "tokens" for span, "sentences" for sentence, "documents" for document classification.
 */
export const classifierUnitLabel: Record<ClassifierModel, string> = {
  [ClassifierModel.SPAN]: "tokens",
  [ClassifierModel.SENTENCE]: "sentences",
  [ClassifierModel.DOCUMENT]: "documents",
};
