import { useEffect } from "react";

interface JumpToSpanAnnotationOptions {
  /** The `block` option for `scrollIntoView` (vertical alignment). Defaults to `"smooth"` start. */
  block?: ScrollLogicalPosition;
  /** Retry interval (ms) while the target token is not mounted yet. Defaults to 300. */
  retryIntervalMs?: number;
}

/**
 * Scrolls to the given span annotation's token.
 *
 * Tokens (`.span-<id>`) are always rendered for a span annotation, so the first
 * token of the span is a reliable scroll target (unlike the code pill, which is
 * hidden when code indicators are off). Because tokens may be virtualized and
 * mount after the id is set, the scroll is retried on an interval until a
 * matching token is found (the interval is cleared on cleanup).
 *
 * @param annotationId - the span annotation to jump to (`undefined`/`null` to do nothing).
 * @param options - scroll alignment and retry interval.
 */
export function useJumpToSpanAnnotation(
  annotationId: number | undefined | null,
  options?: JumpToSpanAnnotationOptions,
) {
  const { block, retryIntervalMs = 300 } = options ?? {};

  useEffect(() => {
    if (annotationId === undefined || annotationId === null) {
      return;
    }

    const scrollIntoView = () => {
      const annotation = document.querySelector(`.span-${annotationId}`);
      if (annotation) {
        annotation.scrollIntoView({ behavior: "smooth", ...(block ? { block } : {}) });
        return true;
      }
      return false;
    };

    if (!scrollIntoView()) {
      const intervalHandle = setInterval(() => {
        if (scrollIntoView()) {
          clearInterval(intervalHandle);
        }
      }, retryIntervalMs);
      return () => clearInterval(intervalHandle);
    }
  }, [annotationId, block, retryIntervalMs]);
}
