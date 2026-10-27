import { AgreementMode } from "@models/AgreementMode";
import { AgreementSegment } from "@models/AgreementSegment";

/** Stands for "no code" in a confusion matrix cell (the backend uses null). */
export const NO_CODE = -1;

export const agreementModeLabels: Record<AgreementMode, string> = {
  [AgreementMode.SPAN_WORD]: "Spans, word level",
  [AgreementMode.SPAN_STRICT]: "Spans, strict",
  [AgreementMode.SENTENCE]: "Sentences",
};

export const agreementModeDescriptions: Record<AgreementMode, string> = {
  [AgreementMode.SPAN_WORD]:
    "Every word counts and is correct if it carries the right code, wherever the spans begin or end.",
  [AgreementMode.SPAN_STRICT]: "A span is correct only if its code and its exact begin and end match.",
  [AgreementMode.SENTENCE]: "Every sentence counts and is correct if it carries the right code.",
};

/** Which segments to show, from the point of view of one code (or of all codes). */
export enum SegmentErrorType {
  DISAGREEMENT = "disagreement",
  FALSE_NEGATIVE = "false_negative",
  FALSE_POSITIVE = "false_positive",
  CONFUSION = "confusion",
  AGREEMENT = "agreement",
  ALL = "all",
}

export const segmentErrorTypeLabels: Record<SegmentErrorType, string> = {
  [SegmentErrorType.DISAGREEMENT]: "All disagreements",
  [SegmentErrorType.FALSE_NEGATIVE]: "Missed (false negatives)",
  [SegmentErrorType.FALSE_POSITIVE]: "Extra (false positives)",
  [SegmentErrorType.CONFUSION]: "Confused codes",
  [SegmentErrorType.AGREEMENT]: "Agreements",
  [SegmentErrorType.ALL]: "All segments",
};

export interface AgreementCell {
  /** Reference code of the confusion matrix row, or NO_CODE. */
  referenceCodeId: number;
  /** Compared code of the confusion matrix column, or NO_CODE. */
  comparedCodeId: number;
}

export interface SegmentFilter {
  errorType: SegmentErrorType;
  /** Only segments where this code is involved in the error type. */
  codeId?: number;
  /** Only segments of this document. */
  sdocId?: number;
  /** Only segments counted in this confusion matrix cell. */
  cell?: AgreementCell;
}

/** Whether the segment shows the error type, for the code or (without a code) for any code. */
export function segmentHasErrorType(segment: AgreementSegment, errorType: SegmentErrorType, codeId?: number): boolean {
  const fn = segment.false_negative_code_ids;
  const fp = segment.false_positive_code_ids;
  const involves = (codeIds: number[]) => (codeId === undefined ? codeIds.length > 0 : codeIds.includes(codeId));
  switch (errorType) {
    case SegmentErrorType.DISAGREEMENT:
      return involves(fn) || involves(fp);
    case SegmentErrorType.FALSE_NEGATIVE:
      return involves(fn);
    case SegmentErrorType.FALSE_POSITIVE:
      return involves(fp);
    case SegmentErrorType.CONFUSION:
      return fn.length > 0 && fp.length > 0 && (involves(fn) || involves(fp));
    case SegmentErrorType.AGREEMENT:
      return codeId === undefined
        ? fn.length === 0 && fp.length === 0
        : segment.true_positive_code_ids.includes(codeId);
    case SegmentErrorType.ALL:
      return (
        codeId === undefined ||
        segment.reference_code_ids.includes(codeId) ||
        segment.compared_code_ids.includes(codeId)
      );
  }
}

/** Whether the segment is counted in the confusion matrix cell (reference code X, compared code Y). */
export function segmentIsInCell(segment: AgreementSegment, cell: AgreementCell): boolean {
  const inSide = (codeIds: number[], codeId: number) =>
    codeId === NO_CODE ? codeIds.length === 0 : codeIds.includes(codeId);
  return (
    inSide(segment.reference_code_ids, cell.referenceCodeId) && inSide(segment.compared_code_ids, cell.comparedCodeId)
  );
}

export function filterSegments(segments: AgreementSegment[], filter: SegmentFilter): AgreementSegment[] {
  return segments.filter(
    (segment) =>
      (filter.sdocId === undefined || segment.sdoc_id === filter.sdocId) &&
      (filter.cell === undefined || segmentIsInCell(segment, filter.cell)) &&
      segmentHasErrorType(segment, filter.errorType, filter.codeId),
  );
}

const csvValue = (value: string | number | null) => {
  if (value === null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export interface SegmentsCsvContext {
  mode: AgreementMode;
  referenceUser: { id: number; name: string };
  comparedUser: { id: number; name: string };
  sdocNames: Record<number, string>;
  codeNames: Record<number, string>;
}

/**
 * Serializes segments to CSV, one row per segment, with the scoring mode, both
 * annotators, the document name, code names and annotation IDs.
 */
export function segmentsToCsv(segments: AgreementSegment[], context: SegmentsCsvContext): string {
  const { mode, referenceUser, comparedUser, sdocNames, codeNames } = context;
  const names = (codeIds: number[]) => codeIds.map((codeId) => codeNames[codeId] ?? codeId).join("; ");
  const ids = (annotationIds: number[]) => annotationIds.join("; ");
  const header = [
    "mode",
    "reference_user_id",
    "reference_user",
    "compared_user_id",
    "compared_user",
    "sdoc_id",
    "sdoc_name",
    "begin",
    "end",
    "begin_token",
    "end_token",
    "sentence_id_start",
    "sentence_id_end",
    "num_units",
    "text",
    "reference_codes",
    "compared_codes",
    "true_positive_codes",
    "false_negative_codes",
    "false_positive_codes",
    "reference_annotation_ids",
    "compared_annotation_ids",
  ];
  const rows = segments.map((s) => [
    mode,
    referenceUser.id,
    referenceUser.name,
    comparedUser.id,
    comparedUser.name,
    s.sdoc_id,
    sdocNames[s.sdoc_id] ?? "",
    s.begin,
    s.end,
    s.begin_token,
    s.end_token,
    s.sentence_id_start,
    s.sentence_id_end,
    s.num_units,
    s.text,
    names(s.reference_code_ids),
    names(s.compared_code_ids),
    names(s.true_positive_code_ids),
    names(s.false_negative_code_ids),
    names(s.false_positive_code_ids),
    ids(s.reference_annotation_ids),
    ids(s.compared_annotation_ids),
  ]);
  return [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
}

/** The scoring modes that the span comparator and the sentence comparator can show. */
export const SPAN_AGREEMENT_MODES = [AgreementMode.SPAN_WORD, AgreementMode.SPAN_STRICT];
export const SENTENCE_AGREEMENT_MODES = [AgreementMode.SENTENCE];

/**
 * The units a segment covers: tokens [start, end) in the span modes,
 * sentences [start, end] (inclusive) in the sentence mode.
 */
export interface AgreementFocus {
  start: number;
  end: number;
}

export function segmentFocus(segment: AgreementSegment): AgreementFocus {
  if (segment.sentence_id_start !== null && segment.sentence_id_end !== null) {
    return { start: segment.sentence_id_start, end: segment.sentence_id_end };
  }
  return { start: segment.begin_token ?? 0, end: segment.end_token ?? 0 };
}
