/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SDocStatus } from "./SDocStatus";
export type SourceDocumentUpdate = {
  /**
   * User-defined name of the document (default is the filename)
   */
  name?: string | null;
  /**
   * ID of the Folder this SourceDocument belongs to
   */
  folder_id?: number | null;
  /**
   * Extract HTML done?
   */
  extract_html?: SDocStatus | null;
  /**
   * Text Extraction done?
   */
  text_extraction?: SDocStatus | null;
  /**
   * Text Language Detection done?
   */
  text_language_detection?: SDocStatus | null;
  /**
   * Text Spacy done?
   */
  text_spacy?: SDocStatus | null;
  /**
   * Text ES Index done?
   */
  text_es_index?: SDocStatus | null;
  /**
   * Text Sentence Embedding done?
   */
  text_sentence_embedding?: SDocStatus | null;
  /**
   * Text HTML Mapping done?
   */
  text_html_mapping?: SDocStatus | null;
  /**
   * Image Captioning done?
   */
  image_caption?: SDocStatus | null;
  /**
   * Image Embedding done?
   */
  image_embedding?: SDocStatus | null;
  /**
   * Image Metadata Extraction done?
   */
  image_metadata_extraction?: SDocStatus | null;
  /**
   * Image Thumbnail Generation done?
   */
  image_thumbnail?: SDocStatus | null;
  /**
   * Object Detection done?
   */
  image_object_detection?: SDocStatus | null;
  /**
   * Audio Metadata Extraction done?
   */
  audio_metadata?: SDocStatus | null;
  /**
   * Audio Thumbnail Generation done?
   */
  audio_thumbnail?: SDocStatus | null;
  /**
   * Transcription done?
   */
  audio_transcription?: SDocStatus | null;
  /**
   * Video Metadata Extraction done?
   */
  video_metadata?: SDocStatus | null;
  /**
   * Video Thumbnail Generation done?
   */
  video_thumbnail?: SDocStatus | null;
  /**
   * Video Audio Extraction done?
   */
  video_audio_extraction?: SDocStatus | null;
};
