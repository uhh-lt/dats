import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { PointerEvent as ReactPointerEvent } from "react";

export interface IToken {
  text: string;
  newLine: number;
  beginChar: number;
  endChar: number;
  whitespace: boolean;
  index: number;
}

/** Where the code pills of span annotations are shown: inline with the text, above it, or not at all. */
export enum TagStyle {
  Inline = "inline",
  Above = "above",
  None = "none",
}

export type SpanAnnotationBoundary = "start" | "end";

export type SpanAnnotationResizeStartHandler = (
  annotation: SpanAnnotationRead,
  boundary: SpanAnnotationBoundary,
  event: ReactPointerEvent<HTMLSpanElement>,
) => void;

export type SentenceAnnotationBoundary = "start" | "end";

export type SentenceAnnotationResizeStartHandler = (
  annotation: SentenceAnnotationRead,
  boundary: SentenceAnnotationBoundary,
  event: ReactPointerEvent<HTMLElement>,
) => void;

/** The sentence annotations of one sentence by id. */
export type SentAnnoMap = Record<number, SentenceAnnotationRead>;
