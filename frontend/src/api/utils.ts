import { useCallback } from "react";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { BBoxAnnotationReadResolved } from "./openapi/models/BBoxAnnotationReadResolved.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { SpanAnnotationReadResolved } from "./openapi/models/SpanAnnotationReadResolved.ts";

export const useSelectEnabledSpanAnnotations = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: SpanAnnotationReadResolved[]) =>
      data.filter((spanAnnotation) => disabledCodeIds.indexOf(spanAnnotation.code.id) === -1),
    [disabledCodeIds],
  );
};

export const useSelectEnabledBboxAnnotations = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: BBoxAnnotationReadResolved[]) =>
      data.filter((bboxAnnotation) => disabledCodeIds.indexOf(bboxAnnotation.code.id) === -1),
    [disabledCodeIds],
  );
};

export const useSelectEnabledCodes = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: CodeRead[]) => data.filter((code) => disabledCodeIds.indexOf(code.id) === -1),
    [disabledCodeIds],
  );
};
