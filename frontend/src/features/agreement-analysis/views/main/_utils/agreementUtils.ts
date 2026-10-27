import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { AgreementScoring } from "@models/AgreementScoring";
import { AgreementSegment } from "@models/AgreementSegment";
import type { RegisteredRouter } from "@tanstack/react-router";
import type { RouteTypesById } from "@tanstack/router-core";
import type { AgreementAnalysisRouteAPI } from "../_hooks/agreementAnalysisRouteAPI";

/** Stands for "no code" in a confusion matrix cell (the backend uses null). */
export const NO_CODE = -1;

export const annotationTypeLabels: Record<AgreementAnnotationType, string> = {
  [AgreementAnnotationType.SPAN]: "Span annotations",
  [AgreementAnnotationType.SENTENCE]: "Sentence annotations",
};

export const annotationTypeDescriptions: Record<AgreementAnnotationType, string> = {
  [AgreementAnnotationType.SPAN]: "Annotations of words and phrases. Their constituents are words.",
  [AgreementAnnotationType.SENTENCE]: "Annotations of one or more whole sentences. Their constituents are sentences.",
};

export function scoringLabel(annotationType: AgreementAnnotationType, scoring: AgreementScoring): string {
  if (scoring === AgreementScoring.EXACT) return "Exact boundaries";
  return annotationType === AgreementAnnotationType.SPAN ? "Per word" : "Per sentence";
}

export function scoringDescription(annotationType: AgreementAnnotationType, scoring: AgreementScoring): string {
  const constituent = annotationType === AgreementAnnotationType.SPAN ? "word" : "sentence";
  if (scoring === AgreementScoring.EXACT) {
    return (
      `Every annotation counts as a whole: it is correct only if the other annotator assigned the same code ` +
      `from exactly the same first to the same last ${constituent}. ` +
      `3 annotated ${constituent}s against 2 of them are a miss and an extra.`
    );
  }
  return (
    `Every ${constituent} counts on its own: it is correct if it carries the same code on both sides, ` +
    `wherever the annotations begin or end. 3 annotated ${constituent}s against 2 of them: 2 of 3 are correct.`
  );
}

/**
 * Which segments to show, from the point of view of one code (or of all codes). The values are
 * declared by the search schema of the route, which stores the selection in the URL.
 */
export type SegmentErrorType = RouteTypesById<
  RegisteredRouter,
  typeof AgreementAnalysisRouteAPI.id
>["fullSearchSchema"]["errorType"];

/** The error types in the order of the selector. */
export const segmentErrorTypes: SegmentErrorType[] = [
  "disagreement",
  "false_negative",
  "false_positive",
  "confusion",
  "agreement",
  "all",
];

export const segmentErrorTypeLabels: Record<SegmentErrorType, string> = {
  disagreement: "All mismatches",
  false_negative: "Missed",
  false_positive: "Extra",
  confusion: "Different code",
  agreement: "Matches",
  all: "All segments",
};

export const segmentErrorTypeDescriptions: Record<SegmentErrorType, string> = {
  disagreement: "Everywhere the annotators differ: missed, extra or different codes.",
  false_negative: "The reference assigned a code that the compared annotator did not assign here (false negatives).",
  false_positive: "The compared annotator assigned a code that the reference did not assign here (false positives).",
  confusion: "Both annotators annotated the same place, but with different codes: a missed and an extra code at once.",
  agreement: "Both annotators assigned the same code (true positives).",
  all: "Every place where at least one annotator assigned a selected code, matching or not.",
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
    case "disagreement":
      return involves(fn) || involves(fp);
    case "false_negative":
      return involves(fn);
    case "false_positive":
      return involves(fp);
    case "confusion":
      return fn.length > 0 && fp.length > 0 && (involves(fn) || involves(fp));
    case "agreement":
      return codeId === undefined
        ? fn.length === 0 && fp.length === 0
        : segment.true_positive_code_ids.includes(codeId);
    case "all":
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
  annotationType: AgreementAnnotationType;
  scoring: AgreementScoring;
  referenceUser: { id: number; name: string };
  comparedUser: { id: number; name: string };
  sdocNames: Record<number, string>;
  codeNames: Record<number, string>;
}

/**
 * Serializes segments to CSV, one row per segment, with the annotation type and scoring, both
 * annotators, the document name, code names and annotation IDs.
 */
export function segmentsToCsv(segments: AgreementSegment[], context: SegmentsCsvContext): string {
  const { annotationType, scoring, referenceUser, comparedUser, sdocNames, codeNames } = context;
  const names = (codeIds: number[]) => codeIds.map((codeId) => codeNames[codeId] ?? codeId).join("; ");
  const ids = (annotationIds: number[]) => annotationIds.join("; ");
  const header = [
    "annotation_type",
    "scoring",
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
    annotationType,
    scoring,
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
