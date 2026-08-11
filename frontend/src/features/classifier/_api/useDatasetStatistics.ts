import { useAppSelector } from "@store/storeHooks";
import { ClassifierHooks } from "./classifierQueryOptions";

/**
 * Shared hook for the classifier dialog data-selection steps (training & evaluation).
 * Reads the current selection from the classifier store, resolves the base model
 * (from training settings or, in the evaluation flow, from the selected classifier),
 * and fetches the dataset statistics.
 */
export function useDatasetStatistics() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.classifierModel);
  const projectId = useAppSelector((state) => state.classifier.classifierProjectId);
  const classIds = useAppSelector((state) => state.classifier.classifierClassIds);
  const userIds = useAppSelector((state) => state.classifier.classifierUserIds);
  const tagIds = useAppSelector((state) => state.classifier.classifierTagIds);
  const mergeChildren = useAppSelector((state) => state.classifier.classifierMergeChildren);
  const classifierId = useAppSelector((state) => state.classifier.classifierId);
  const trainingBaseModelName = useAppSelector((state) => state.classifier.classifierTrainingSettings?.base_name);

  // in the EVALUATION flow we know the classifier, so we use its actual base model
  const classifiers = ClassifierHooks.useGetAllClassifiers(projectId);
  const classifier = classifiers.data?.find((c) => c.id === classifierId);
  const baseModelName = trainingBaseModelName ?? classifier?.base_model ?? "";

  // global server state
  const datasetStats = ClassifierHooks.useComputeDatasetStatistics2({
    projectId,
    model,
    classIds,
    userIds,
    tagIds,
    mergeChildren,
    baseModelName,
  });

  return { model, datasetStats };
}
