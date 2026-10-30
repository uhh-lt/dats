import type { DirectiveFormatter, DirectiveSegment } from "@assistant-ui/react";
import { AttachedObjectType } from "@models/AttachedObjectType";

/**
 * DATS entities in the chat are Markdown links with the "dats:" scheme:
 * `[Interview 3](dats:source_document/12)`. The user's @-mentions insert them,
 * the agent writes them in its answers (see its system prompt), and the chat
 * renders them with the entity renderers.
 */
export const DATS_LINK_SCHEME = "dats:";

export interface DatsEntity {
  type: AttachedObjectType;
  id: number;
}

const ENTITY_TYPES: readonly string[] = Object.values(AttachedObjectType);

const isEntityType = (type: string): type is AttachedObjectType => ENTITY_TYPES.includes(type);

/** The entity of a "dats:<type>/<id>" link, or undefined for any other link. */
export const parseDatsLink = (href: string | undefined): DatsEntity | undefined => {
  const match = href?.match(/^dats:([a-z_]+)\/(\d+)$/);
  if (!match || !isEntityType(match[1])) return undefined;
  return { type: match[1], id: Number(match[2]) };
};

const MENTION_PATTERN = /\[([^\]]+)\]\(dats:([a-z_]+)\/(\d+)\)/g;

/** Inserts @-mentions as DATS links and finds them again in a prompt. */
export const datsLinkFormatter: DirectiveFormatter = {
  serialize: (item) => `[${item.label.replace(/[[\]]/g, "")}](${DATS_LINK_SCHEME}${item.type}/${item.id})`,
  parse: (text) => {
    const segments: DirectiveSegment[] = [];
    let last = 0;
    for (const match of text.matchAll(MENTION_PATTERN)) {
      const index = match.index ?? 0;
      if (index > last) segments.push({ kind: "text", text: text.slice(last, index) });
      if (isEntityType(match[2])) {
        segments.push({ kind: "mention", label: match[1], type: match[2], id: match[3] });
      } else {
        segments.push({ kind: "text", text: match[0] });
      }
      last = index + match[0].length;
    }
    if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
    return segments;
  },
};

// argument and result keys that hold the id of an entity
const ID_KEY_TYPES: Record<string, AttachedObjectType> = {
  project_id: AttachedObjectType.PROJECT,
  sdoc_id: AttachedObjectType.SOURCE_DOCUMENT,
  source_document_id: AttachedObjectType.SOURCE_DOCUMENT,
  code_id: AttachedObjectType.CODE,
  tag_id: AttachedObjectType.TAG,
  span_id: AttachedObjectType.SPAN_ANNOTATION,
  span_anno_id: AttachedObjectType.SPAN_ANNOTATION,
  span_annotation_id: AttachedObjectType.SPAN_ANNOTATION,
  sentence_anno_id: AttachedObjectType.SENTENCE_ANNOTATION,
  sentence_annotation_id: AttachedObjectType.SENTENCE_ANNOTATION,
  bbox_id: AttachedObjectType.BBOX_ANNOTATION,
  bbox_annotation_id: AttachedObjectType.BBOX_ANNOTATION,
};

/** The entity type of an argument such as "code_id", or undefined. */
export const entityTypeOfKey = (key: string): AttachedObjectType | undefined => ID_KEY_TYPES[key];

// the tools (by name prefix) whose results are entities of one type, so their "id" keys are ids of that type
const TOOL_PREFIX_TYPES: [string, AttachedObjectType][] = [
  ["project_", AttachedObjectType.PROJECT],
  ["sourceDocument_", AttachedObjectType.SOURCE_DOCUMENT],
  ["code_", AttachedObjectType.CODE],
  ["tag_", AttachedObjectType.TAG],
  ["spanAnnotation_", AttachedObjectType.SPAN_ANNOTATION],
  ["sentenceAnnotation_", AttachedObjectType.SENTENCE_ANNOTATION],
  ["bboxAnnotation_", AttachedObjectType.BBOX_ANNOTATION],
  ["search_search_sdoc", AttachedObjectType.SOURCE_DOCUMENT],
  ["search_search_span_annotation", AttachedObjectType.SPAN_ANNOTATION],
  ["search_search_sentence_annotation", AttachedObjectType.SENTENCE_ANNOTATION],
  ["search_search_bbox_annotation", AttachedObjectType.BBOX_ANNOTATION],
];

const OTHER_ENTITY_KEY = /folder|user|annotator|memo|metadata/;

/** The entity type of the "id" keys in the results of a tool, or undefined. */
export const entityTypeOfTool = (toolName: string): AttachedObjectType | undefined =>
  TOOL_PREFIX_TYPES.find(([prefix]) => toolName.startsWith(prefix))?.[1];

/**
 * The entities a tool result references, deduplicated, at most `limit`: id
 * keys ("code_id": 5) and, with `idType`, the "id" keys of its objects.
 */
export const findReferencedEntities = (
  value: unknown,
  limit: number,
  idType: AttachedObjectType | undefined,
): DatsEntity[] => {
  const found = new Map<string, DatsEntity>();
  const visit = (node: unknown, nodeIdType: AttachedObjectType | undefined) => {
    if (found.size >= limit || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, nodeIdType));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      const type = key === "id" ? nodeIdType : entityTypeOfKey(key);
      if (type !== undefined && typeof child === "number") found.set(`${type}/${child}`, { type, id: child });
      // collections of other entities (a search's folders, users, ...) have ids of their own type
      else visit(child, OTHER_ENTITY_KEY.test(key) ? undefined : nodeIdType);
    }
  };
  visit(value, idType);
  return [...found.values()].slice(0, limit);
};
