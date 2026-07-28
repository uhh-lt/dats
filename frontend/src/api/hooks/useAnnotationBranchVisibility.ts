import { useAppSelector } from "@store/storeHooks";
import { useMemo } from "react";
import { CodeHooks } from "./CodeHooks";

interface AnnotationCodeReference {
  id: number;
  code_id: number;
}

export type ContextualAnnotation<T> = T & { requires_review: boolean };

export const useAnnotationRequiresReview = (codeId: number) => {
  const snapshot = CodeHooks.useGetCode(codeId);
  const selectedBranchId = CodeHooks.useSelectedCodeBranchId();
  const visibleCodes = CodeHooks.useGetAllCodesList();

  if (!snapshot.data || !visibleCodes.data) return false;
  const isInReviewScope = snapshot.data.branch_id === null || snapshot.data.branch_id === selectedBranchId;
  const current = visibleCodes.data.find((code) => code.concept_id === snapshot.data.concept_id);
  return isInReviewScope && current?.id !== snapshot.data.id;
};

export const useAnnotationBranchVisibility = <T extends AnnotationCodeReference>(annotations: T[] | undefined) => {
  const selectedBranchId = CodeHooks.useSelectedCodeBranchId();
  const visibleCodes = CodeHooks.useGetAllCodesList();
  const showExternalAnnotations = useAppSelector((state) => state.annotations.showExternalAnnotations ?? false);
  const codeIds = useMemo(
    () => [...new Set(annotations?.map((annotation) => annotation.code_id) ?? [])],
    [annotations],
  );
  const snapshots = CodeHooks.useGetCodeSnapshots(codeIds);

  return useMemo(() => {
    if (!annotations || snapshots.isLoading || visibleCodes.isLoading) {
      return {
        data: undefined,
        externalCount: 0,
        isLoading: snapshots.isLoading || visibleCodes.isLoading,
      };
    }

    const snapshotsById = new Map(snapshots.data.map((snapshot) => [snapshot.id, snapshot]));
    const currentByConcept = new Map(visibleCodes.data?.map((code) => [code.concept_id, code]));
    const contextualAnnotations: ContextualAnnotation<T>[] = annotations.map((annotation) => {
      const snapshot = snapshotsById.get(annotation.code_id);
      const isInReviewScope = snapshot?.branch_id === null || snapshot?.branch_id === selectedBranchId;
      return {
        ...annotation,
        requires_review:
          snapshot !== undefined && isInReviewScope && currentByConcept.get(snapshot.concept_id)?.id !== snapshot.id,
      };
    });
    const externalAnnotationIds = new Set(
      contextualAnnotations
        .filter((annotation) => {
          const branchId = snapshotsById.get(annotation.code_id)?.branch_id;
          return branchId === undefined || (branchId !== null && branchId !== selectedBranchId);
        })
        .map((annotation) => annotation.id),
    );

    return {
      data: showExternalAnnotations
        ? contextualAnnotations
        : contextualAnnotations.filter((annotation) => !externalAnnotationIds.has(annotation.id)),
      externalCount: externalAnnotationIds.size,
      isLoading: false,
    };
  }, [
    annotations,
    selectedBranchId,
    showExternalAnnotations,
    snapshots.data,
    snapshots.isLoading,
    visibleCodes.data,
    visibleCodes.isLoading,
  ]);
};
