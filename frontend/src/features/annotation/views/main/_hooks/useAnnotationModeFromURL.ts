import { useAppDispatch } from "@store/storeHooks";
import { useEffect } from "react";
import { AnnotationMode } from "../../../_types/AnnotationMode";
import { AnnotationsActions } from "../../../store/annotationsSlice";
import { AnnotationRouteAPI } from "./annotationRouteAPI";

/**
 * Switches to the annotation mode requested in the URL (span or sentence annotation),
 * e.g. when the agreement analysis opens a document. Runs only when the URL value
 * changes, so the user can switch the mode afterwards.
 */
export function useAnnotationModeFromURL() {
  const dispatch = useAppDispatch();
  const { annotationMode } = AnnotationRouteAPI.useSearch();

  useEffect(() => {
    if (annotationMode === undefined) return;
    dispatch(
      AnnotationsActions.onChangeAnnotationMode(
        annotationMode === "sentence" ? AnnotationMode.SentenceAnnotation : AnnotationMode.Annotation,
      ),
    );
  }, [annotationMode, dispatch]);
}
