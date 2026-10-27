import { AgreementMode } from "@models/AgreementMode";
import { useAppDispatch } from "@store/storeHooks";
import { useEffect } from "react";
import { AnnotationMode } from "../../../_types/AnnotationMode";
import { AnnotationsActions } from "../../../store/annotationsSlice";
import { AnnotationRouteAPI } from "./annotationRouteAPI";

/**
 * Opens the comparator that fits the agreement scoring mode of the URL (span or
 * sentence comparator), e.g. when a segment of the agreement analysis is opened.
 * Runs only when the mode in the URL changes, so the user can switch afterwards.
 */
export function useSyncAnnotationModeWithAgreement() {
  const dispatch = useAppDispatch();
  const { agreementMode } = AnnotationRouteAPI.useSearch();

  useEffect(() => {
    if (agreementMode === undefined) return;
    dispatch(
      AnnotationsActions.onChangeAnnotationMode(
        agreementMode === AgreementMode.SENTENCE ? AnnotationMode.SentenceAnnotation : AnnotationMode.Annotation,
      ),
    );
  }, [agreementMode, dispatch]);
}
