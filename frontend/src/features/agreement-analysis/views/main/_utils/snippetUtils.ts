import { partitionDocument } from "@core/annotation";
import { AgreementSegment } from "@models/AgreementSegment";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";

// a paragraph longer than this is too long as context; the sentences around the segment are used instead
const MAX_PARAGRAPH_TOKENS = 300;

/** A range of sentences: [first, last], both inclusive. */
export interface SnippetRange {
  first: number;
  last: number;
}

/** The blocks (paragraphs) of the span annotation comparator, plus the sentence of every token and the HTML of every sentence. */
interface DocumentStructure {
  blocks: ReturnType<typeof partitionDocument>["renderBlocks"];
  sentenceTokenIds: number[][];
  tokenSentence: Map<number, number>;
  sentenceHtml: string[];
}

// parsed once per document data object (react query keeps it stable)
const structureCache = new WeakMap<SourceDocumentDataRead, DocumentStructure>();

function documentStructure(sdocData: SourceDocumentDataRead): DocumentStructure {
  const cached = structureCache.get(sdocData);
  if (cached) return cached;

  const { renderBlocks, sentenceTokenIds } = partitionDocument(sdocData.html);
  const tokenSentence = new Map<number, number>();
  sentenceTokenIds.forEach((tokenIds, sentenceId) => tokenIds.forEach((token) => tokenSentence.set(token, sentenceId)));
  const html = new DOMParser().parseFromString(sdocData.html, "text/html");
  const sentenceHtml = Array.from(html.querySelectorAll("sent")).map((sentence) => sentence.outerHTML);

  const structure = { blocks: renderBlocks, sentenceTokenIds, tokenSentence, sentenceHtml };
  structureCache.set(sdocData, structure);
  return structure;
}

/**
 * The HTML shown around a span segment, one entry per block: the paragraph(s) that contain the
 * segment's annotations (the same blocks as in the span annotation comparator), or, if they are
 * too long, the sentences of the annotations plus one sentence before and after.
 */
export function spanSnippetHtml(
  segment: AgreementSegment,
  sdocData: SourceDocumentDataRead,
  annotations: SpanAnnotationRead[],
): string[] {
  const structure = documentStructure(sdocData);
  const tokens = annotations.flatMap((annotation) => [annotation.begin_token, annotation.end_token - 1]);
  if (segment.begin_token !== null) tokens.push(segment.begin_token);
  if (segment.end_token !== null) tokens.push(segment.end_token - 1);
  const sentences = tokens.flatMap((token) => structure.tokenSentence.get(token) ?? []);
  if (sentences.length === 0) return [];
  const first = Math.min(...sentences);
  const last = Math.max(...sentences);

  const blocks = structure.blocks.filter((block) => block.sentenceIds.some((s) => s >= first && s <= last));
  const blockTokens = blocks.reduce(
    (count, block) =>
      count + block.sentenceIds.reduce((sum, s) => sum + (structure.sentenceTokenIds[s]?.length ?? 0), 0),
    0,
  );
  if (blocks.length > 0 && blockTokens <= MAX_PARAGRAPH_TOKENS) {
    return blocks.map((block) => block.html);
  }
  return [structure.sentenceHtml.slice(Math.max(0, first - 1), last + 2).join(" ")];
}

/** The sentences shown around a sentence segment: its annotations plus one sentence before and after. */
export function sentenceSnippetRange(
  segment: AgreementSegment,
  sdocData: SourceDocumentDataRead,
  annotations: SentenceAnnotationRead[],
): SnippetRange {
  let first = segment.sentence_id_start ?? 0;
  let last = segment.sentence_id_end ?? first;
  annotations.forEach((annotation) => {
    first = Math.min(first, annotation.sentence_id_start);
    last = Math.max(last, annotation.sentence_id_end);
  });
  return { first: Math.max(0, first - 1), last: Math.min(sdocData.sentences.length - 1, last + 1) };
}

/** The annotations of one annotator that belong to the segment. */
export function segmentAnnotations<T extends { id: number }>(annotations: T[] | undefined, ids: number[]): T[] {
  const segmentIds = new Set(ids);
  return (annotations ?? []).filter((annotation) => segmentIds.has(annotation.id));
}
