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
  const model = useAppSelector((state) => state.classifier.context.model);
  const projectId = useAppSelector((state) => state.classifier.context.projectId);
  const classIds = useAppSelector((state) => state.classifier.dataset.classIds);
  const userIds = useAppSelector((state) => state.classifier.dataset.userIds);
  const tagIds = useAppSelector((state) => state.classifier.dataset.tagIds);
  const mergeChildren = useAppSelector((state) => state.classifier.dataset.mergeChildren);
  const classifierId = useAppSelector((state) => state.classifier.context.classifierId);
  const trainingBaseModelName = useAppSelector((state) => state.classifier.drafts.trainingSettings?.base_name);

  // in the EVALUATION flow we know the classifier, so we use its actual base model
  const classifiers = ClassifierHooks.useGetAllClassifiers(projectId);
  const classifier = classifiers.data?.find((c) => c.id === classifierId);
  const baseModelName = trainingBaseModelName ?? classifier?.base_model ?? "";

  // global server state
  const datasetStats = ClassifierHooks.useComputeDatasetStatistics({
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
