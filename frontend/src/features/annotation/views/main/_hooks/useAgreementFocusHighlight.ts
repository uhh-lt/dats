import { useEffect } from "react";

/** The CSS class of the elements of the segment focused by the mismatch navigation. */
export const AGREEMENT_FOCUS_CLASS = "agreement-focus";

/**
 * Highlights the elements matching the selector inside the container, e.g. the
 * tokens or sentence rows of the focused agreement segment. The comparators are
 * virtualized and re-mount rows while scrolling, so the class is re-applied
 * whenever the container's children change.
 *
 * @param getContainer - returns the element to search in (null while not mounted).
 * @param selector - the elements to highlight (undefined to highlight nothing).
 */
export function useAgreementFocusHighlight(getContainer: () => HTMLElement | null, selector: string | undefined) {
  useEffect(() => {
    const container = getContainer();
    if (!container || !selector) return;

    const apply = () => {
      container.querySelectorAll(selector).forEach((el) => el.classList.add(AGREEMENT_FOCUS_CLASS));
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      container
        .querySelectorAll(`.${AGREEMENT_FOCUS_CLASS}`)
        .forEach((el) => el.classList.remove(AGREEMENT_FOCUS_CLASS));
    };
  }, [getContainer, selector]);
}
