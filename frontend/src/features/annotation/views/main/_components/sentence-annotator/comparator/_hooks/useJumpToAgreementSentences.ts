import { AgreementMode } from "@models/AgreementMode";
import { Virtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect } from "react";
import { AnnotationRouteAPI } from "../../../../_hooks/annotationRouteAPI";
import { useAgreementFocusHighlight } from "../../../../_hooks/useAgreementFocusHighlight";

/**
 * Scrolls to and highlights the sentences [start, end] of the agreement segment
 * focused by the mismatch navigation (sentence scoring mode only). Row i + 1 of
 * the virtualizer is sentence i (row 0 is the header).
 */
export function useJumpToAgreementSentences(virtualizer: Virtualizer<HTMLDivElement, Element>, container: HTMLElement) {
  const { agreementMode, agreementFocusStart: start, agreementFocusEnd: end } = AnnotationRouteAPI.useSearch();
  const isActive = agreementMode === AgreementMode.SENTENCE && start !== undefined && end !== undefined;

  useEffect(() => {
    if (!isActive) return;
    virtualizer.scrollToIndex(start + 1, { align: "center" });
  }, [isActive, start, virtualizer]);

  const getContainer = useCallback(() => container, [container]);
  const selector = isActive
    ? Array.from({ length: end - start + 1 }, (_, i) => `[data-index="${start + i + 1}"]`).join(",")
    : undefined;
  useAgreementFocusHighlight(getContainer, selector);
}
