import { ApiError } from "@api/core/ApiError";
import { CodeRead } from "@models/CodeRead";
import { DocumentUnit } from "@models/DocumentUnit";
import { MetaType } from "@models/MetaType";
import { OutputFormat } from "@models/OutputFormat";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { PromptCode } from "@models/PromptCode";
import { PromptLanguage } from "@models/PromptLanguage";
import { PromptMetadataField } from "@models/PromptMetadataField";
import { PromptSettings } from "@models/PromptSettings";
import { PromptTag } from "@models/PromptTag";
import { TagRead } from "@models/TagRead";
import { TaskType } from "@models/TaskType";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.TAGGING]: "Document Tagging",
  [TaskType.METADATA_EXTRACTION]: "Metadata Extraction",
  [TaskType.ANNOTATION]: "Span Annotation",
  [TaskType.SENTENCE_ANNOTATION]: "Sentence Annotation",
};

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = {
  [OutputFormat.TAGS]: "Document tags",
  [OutputFormat.METADATA]: "Metadata values",
  [OutputFormat.SENTENCES]: "Sentence numbers",
  [OutputFormat.INLINE]: "Inline tags",
  [OutputFormat.CONTEXT]: "Quotes with context",
};

export const DOCUMENT_UNIT_LABELS: Record<DocumentUnit, string> = {
  [DocumentUnit.WHOLE]: "Whole document",
  [DocumentUnit.SENTENCES]: "Sentence by sentence",
  [DocumentUnit.CHUNKS]: "Chunks",
};

// the text of a prompt, written in the editor or rendered in the preview
export const PROMPT_TEXT_STYLE = { fontFamily: "monospace", fontSize: "0.9rem", lineHeight: 1.6 };

export const LANGUAGE_LABELS: Record<PromptLanguage, string> = {
  [PromptLanguage.EN]: "English",
  [PromptLanguage.DE]: "German",
};

// the default output format of a new prompt of a task
export const DEFAULT_OUTPUT_FORMATS: Record<TaskType, OutputFormat> = {
  [TaskType.TAGGING]: OutputFormat.TAGS,
  [TaskType.METADATA_EXTRACTION]: OutputFormat.METADATA,
  [TaskType.ANNOTATION]: OutputFormat.INLINE,
  [TaskType.SENTENCE_ANNOTATION]: OutputFormat.SENTENCES,
};

const DOCUMENT_BLOCK = /<document(?::([a-z_-]*))?>/g;
const OUTPUT_FORMAT_BLOCK = /<output-format(?::([a-z_-]*))?>/g;

export const documentBlock = (unit: DocumentUnit) => `<document:${unit}>`;
export const outputFormatBlock = (outputFormat: OutputFormat) => `<output-format:${outputFormat}>`;

function isDocumentUnit(value: string): value is DocumentUnit {
  return Object.values<string>(DocumentUnit).includes(value);
}

function isOutputFormat(value: string): value is OutputFormat {
  return Object.values<string>(OutputFormat).includes(value);
}

/** The unit of the prompt's document block, undefined unless it has exactly one valid block. */
export function getDocumentUnit(prompt: string): DocumentUnit | undefined {
  const values = [...prompt.matchAll(DOCUMENT_BLOCK)].map((match) => match[1] ?? "");
  if (values.length !== 1 || !isDocumentUnit(values[0])) return undefined;
  return values[0];
}

/** The format of the prompt's output format block, undefined unless it has exactly one valid block. */
export function getOutputFormat(prompt: string): OutputFormat | undefined {
  const values = [...prompt.matchAll(OUTPUT_FORMAT_BLOCK)].map((match) => match[1] ?? "");
  if (values.length !== 1 || !isOutputFormat(values[0])) return undefined;
  return values[0];
}

/** Replace the document block(s) of a prompt, or append one if it has none. */
export function setDocumentUnit(prompt: string, unit: DocumentUnit): string {
  if (!DOCUMENT_BLOCK.test(prompt)) return `${prompt}\n\n${documentBlock(unit)}`;
  return prompt.replace(DOCUMENT_BLOCK, documentBlock(unit));
}

/** Replace the output format block(s) of a prompt, or append one if it has none. */
export function setOutputFormat(prompt: string, outputFormat: OutputFormat): string {
  if (!OUTPUT_FORMAT_BLOCK.test(prompt)) return `${prompt}\n\n${outputFormatBlock(outputFormat)}`;
  return prompt.replace(OUTPUT_FORMAT_BLOCK, outputFormatBlock(outputFormat));
}

// snapshots of project data, as a prompt stores them
export const toPromptCode = (code: CodeRead): PromptCode => ({
  code_id: code.id,
  name: code.name,
  description: code.description ?? "",
});

export const toPromptTag = (tag: TagRead): PromptTag => ({
  tag_id: tag.id,
  name: tag.name,
  description: tag.description ?? "",
});

export const toPromptMetadataField = (field: ProjectMetadataRead): PromptMetadataField => ({
  project_metadata_id: field.id,
  key: field.key,
  description: field.description,
  metatype: field.metatype as MetaType,
});

// the defaults of PromptSettings in the backend
const DEFAULT_SETTINGS: Required<PromptSettings> = {
  chunk_size_tokens: 650,
  chunk_overlap_tokens: 100,
  context_before_chars: 64,
  context_after_chars: 64,
  fuzzy_threshold: 0.85,
};

/** The settings of a prompt with every value set. */
export const withDefaultSettings = (settings: PromptSettings | undefined): Required<PromptSettings> => ({
  ...DEFAULT_SETTINGS,
  ...settings,
});

/** The message of a failed request; the backend sends validation errors of prompts as plain text. */
export function getErrorMessage(error: Error): string {
  if (error instanceof ApiError && typeof error.body === "string") return error.body;
  return error.message;
}
