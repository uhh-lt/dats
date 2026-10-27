import { AgreementMode } from "@models/AgreementMode";
import { Virtualizer } from "@tanstack/react-virtual";
import { useEffect } from "react";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";
import { useAgreementFocusHighlight } from "../../../_hooks/useAgreementFocusHighlight";
import { RenderBlock } from "./useBlockPartition";

/**
 * Scrolls to and highlights the tokens [start, end) of the agreement segment
 * focused by the mismatch navigation (span scoring modes only).
 */
export function useJumpToAgreementTokens(
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  renderBlocks: RenderBlock[],
  sentenceTokenIds: number[][],
  getContainer: () => HTMLElement | null,
) {
  const { agreementMode, agreementFocusStart: start, agreementFocusEnd: end } = AnnotationRouteAPI.useSearch();
  const isActive =
    agreementMode !== undefined && agreementMode !== AgreementMode.SENTENCE && start !== undefined && end !== undefined;

  // scroll to the block that contains the first token
  useEffect(() => {
    if (!isActive) return;
    const sentenceIndex = sentenceTokenIds.findIndex((tokenIds) => tokenIds.includes(start));
    const blockIndex = renderBlocks.findIndex((block) => block.sentenceIds.includes(sentenceIndex));
    if (blockIndex >= 0) {
      virtualizer.scrollToIndex(blockIndex, { align: "center" });
    }
  }, [isActive, start, renderBlocks, sentenceTokenIds, virtualizer]);

  const selector = isActive
    ? Array.from({ length: end - start }, (_, i) => `[data-tokenid="${start + i}"]`).join(",")
    : undefined;
  useAgreementFocusHighlight(getContainer, selector || undefined);
}
