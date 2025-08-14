/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
import type { SDocStatus } from "./SDocStatus";
export type SourceDocumentStatusRead = {
  /**
   * Filename of the SourceDocument
   */
  filename: string;
  /**
   * User-defined name of the document
   */
  name?: string | null;
  /**
   * DOCTYPE of the SourceDocument
   */
  doctype: DocType;
  /**
   * Project the SourceDocument belongs to
   */
  project_id: number;
  /**
   * Extract HTML done?
   */
  extract_html: SDocStatus;
  /**
   * Text Extraction done?
   */
  text_extraction: SDocStatus;
  /**
   * Text Language Detection done?
   */
  text_language_detection: SDocStatus;
  /**
   * Text Spacy done?
   */
  text_spacy: SDocStatus;
  /**
   * Text ES Index done?
   */
  text_es_index: SDocStatus;
  /**
   * Text Sentence Embedding done?
   */
  text_sentence_embedding: SDocStatus;
  /**
   * Text HTML Mapping done?
   */
  text_html_mapping: SDocStatus;
  /**
   * Image Captioning done?
   */
  image_caption: SDocStatus;
  /**
   * Image Embedding done?
   */
  image_embedding: SDocStatus;
  /**
   * Image Metadata Extraction done?
   */
  image_metadata_extraction: SDocStatus;
  /**
   * Image Thumbnail Generation done?
   */
  image_thumbnail: SDocStatus;
  /**
   * Object Detection done?
   */
  image_object_detection: SDocStatus;
  /**
   * Audio Metadata Extraction done?
   */
  audio_metadata: SDocStatus;
  /**
   * Audio Thumbnail Generation done?
   */
  audio_thumbnail: SDocStatus;
  /**
   * Transcription done?
   */
  audio_transcription: SDocStatus;
  /**
   * Video Metadata Extraction done?
   */
  video_metadata: SDocStatus;
  /**
   * Video Thumbnail Generation done?
   */
  video_thumbnail: SDocStatus;
  /**
   * Video Audio Extraction done?
   */
  video_audio_extraction: SDocStatus;
};
