import { useEffect } from "react";

/**
 * The shared CSS class applied to all token elements (`.tok`) that belong to a
 * highlighted span annotation. Tokens carry a `span-<id>` class per annotation
 * (see Token.tsx), so a span is highlighted by toggling this class on all
 * matching `.span-<id>` elements.
 */
export const SPAN_HIGHLIGHT_CLASS = "span-highlighted";

const spanClass = (annotationId: number) => `span-${annotationId}`;

/**
 * Imperatively highlights all tokens of the given span annotation by toggling
 * the shared highlight class on them.
 *
 * Span tokens are rendered through `html-react-parser` and a span can cross
 * block / virtualization boundaries, so the affected `.tok` elements are not
 * reachable through a single React subtree. Toggling a class via
 * `querySelectorAll` is therefore the pragmatic approach (mirrors the
 * comparator's hover-sync) and keeps the highlight in sync regardless of where
 * the tokens are rendered.
 *
 * The previous highlight is removed before applying the new one, and on
 * unmount / when `annotationId` becomes `undefined`.
 *
 * @param annotationId - the span annotation to highlight, or `undefined`/`null` to clear.
 */
export function useSpanAnnotationHighlight(annotationId: number | undefined | null) {
  useEffect(() => {
    const previous = document.querySelectorAll(`.${SPAN_HIGHLIGHT_CLASS}`);
    previous.forEach((el) => el.classList.remove(SPAN_HIGHLIGHT_CLASS));

    if (annotationId === undefined || annotationId === null) {
      return;
    }

    const elements = document.querySelectorAll(`.${spanClass(annotationId)}`);
    elements.forEach((el) => el.classList.add(SPAN_HIGHLIGHT_CLASS));
  }, [annotationId]);
}
