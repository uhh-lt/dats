import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { Virtualizer } from "@tanstack/react-virtual";
import { useEffect } from "react";

interface JumpToSentenceAnnotationOptions {
  /** The `block` option for `scrollIntoView` (vertical alignment). Defaults to `"center"`. */
  block?: ScrollLogicalPosition;
  /** Retry interval (ms) while the target sentence is not mounted yet. Defaults to 300. */
  retryIntervalMs?: number;
  /** Whether to use smooth scrolling. Defaults to `true`. */
  smooth?: boolean;
}

/**
 * Scrolls to the given sentence annotation's first sentence using the virtualizer.
 *
 * Unlike span annotations (which are inline tokens in rendered HTML), sentence
 * annotations are virtualized rows. We must use `virtualizer.scrollToIndex()`
 * to bring the target sentence into view, then the highlight hook can apply
 * the CSS class once the element mounts.
 *
 * @param annotationId - the sentence annotation to jump to (`undefined`/`null` to do nothing).
 * @param virtualizer - the TanStack Virtualizer instance for the sentence list.
 * @param annotations - map of sentence index to annotations (to find the start sentence).
 * @param options - scroll alignment and retry interval.
 */
export function useJumpToSentenceAnnotation(
  annotationId: number | undefined | null,
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  annotations: Record<number, SentenceAnnotationRead[]> | undefined,
  options?: JumpToSentenceAnnotationOptions,
) {
  const { block = "center", retryIntervalMs = 300, smooth = true } = options ?? {};

  useEffect(() => {
    if (annotationId === undefined || annotationId === null || !annotations) {
      return;
    }

    // find the sentence index where this annotation starts
    let targetSentenceIndex: number | null = null;
    for (const [sentenceIndex, sentenceAnnotations] of Object.entries(annotations)) {
      if (sentenceAnnotations.some((anno) => anno.id === annotationId)) {
        targetSentenceIndex = parseInt(sentenceIndex);
        break;
      }
    }

    if (targetSentenceIndex === null) {
      return;
    }

    // scroll the virtualizer to bring the sentence into view
    virtualizer.scrollToIndex(targetSentenceIndex, {
      align: block === "center" ? "center" : "start",
      behavior: smooth ? "smooth" : "auto",
    });

    // after scrolling, the sentence mounts and the highlight hook can find it
    // we don't need to retry here — the highlight hook handles retries
  }, [annotationId, virtualizer, annotations, block, retryIntervalMs, smooth]);
}
