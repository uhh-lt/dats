/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * An enumeration.
 */
export enum SDocStatus {
  UNDEFINED_OR_ERRONEOUS = "undefined_or_erroneous",
  IMPORT_TEXT_DOCUMENT = "import_text_document",
  IMPORT_IMAGE_DOCUMENT = "import_image_document",
  IMPORT_AUDIO_DOCUMENT = "import_audio_document",
  IMPORT_VIDEO_DOCUMENT = "import_video_document",
  CONVERT_TO_WEBP_AND_GENERATE_THUMBNAILS = "convert_to_webp_and_generate_thumbnails",
  CONVERT_MEDIAFILE_TO_UNCOMPRESSED_AUDIO = "convert_mediafile_to_uncompressed_audio",
  CREATE_SDOC_LINKS_FROM_AUDIO = "create_sdoc_links_from_audio",
  GENERATE_WORD_LEVEL_TRANSCRIPTIONS = "generate_word_level_transcriptions",
  CREATE_TRANSCRIPT_FILE = "create_transcript_file",
  CREATE_PPTD_FROM_PPAD = "create_pptd_from_ppad",
  CREATE_SDOC_LINKS_FROM_TEXT = "create_sdoc_links_from_text",
  GENERATE_WEBP_THUMBNAILS_FROM_VIDEO = "generate_webp_thumbnails_from_video",
  CREATE_PPAD_FROM_PPVD = "create_ppad_from_ppvd",
  CLEAN_HTML = "clean_html",
  EXTRACT_TEXT_FROM_HTML_AND_CREATE_SOURCE_MAPPING = "extract_text_from_html_and_create_source_mapping",
  DETECT_LANGUAGE = "detect_language",
  GENERATE_IMAGE_CAPTIONS = "generate_image_captions",
  CREATE_PPTD_FROM_CAPTION = "create_pptd_from_caption",
  GENERATE_SPAN_ANNOTATIONS = "generate_span_annotations",
  GENERATE_BBOX_ANNOTATIONS = "generate_bbox_annotations",
  ADD_CUSTOM_HTML_TAGS = "add_custom_html_tags",
  CREATE_SDOC_LINKS_FROM_HTML = "create_sdoc_links_from_html",
  STORE_METADATA_IN_DB = "store_metadata_in_db",
  STORE_SPAN_ANNOTATIONS_IN_DB = "store_span_annotations_in_db",
  STORE_BBOX_ANNOTATIONS_IN_DB = "store_bbox_annotations_in_db",
  STORE_DOCUMENT_IN_ELASTICSEARCH = "store_document_in_elasticsearch",
  INDEX_IMAGE_DOCUMENT_IN_FAISS = "index_image_document_in_faiss",
  INDEX_TEXT_DOCUMENT_IN_FAISS = "index_text_document_in_faiss",
  FINISHED = "finished",
}
