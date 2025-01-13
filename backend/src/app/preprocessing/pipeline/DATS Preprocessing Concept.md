# DATS Processing Pipelines

One pipeline for every modality:

1. Text
2. Image
3. Audio
4. Video

For every pipeline, we need to execute three major steps:

1. Extract content from raw document
2. Process the content
3. Store the processed information

All modalities will always be converted to text:

- Image \-\> Captioning
- Audio \-\> Transcription
- Video \-\> Transcription

TODO: we need descriptions of every pipeline steps and what it requires

Refactoring:

- Identify common parts of all pipelines
- The text pipeline always has to be run completely!

## Text Pipeline

### Extraction / Init

Goal: Convert text to HTML as the foundation to processing

- create pptd
- extract_content_in_html_from_word_or_pdf_docs
- extract_content_in_html_from_raw_text_docs
- clean_content_in_html

### Processing

- extract_text_from_html_and_create_source_mapping
- detect_content_language
- run_spacy_pipeline
- generate_word_frequncies TODO here we do multiple things in one
- generate_keywords
- generate_sentence_annotations RENAME no annotations
- generate_named_entity_annotations RENAME spans
- apply_html_source_mapping_with_custom_html_tags
- extract_sdoc_links_from_html_of_mixed_documents

### Storage

- remove_erroneous_or_unfinished_sdocs
- write_pptd_to_database
  - persist sdoc
  - persist sdoc data
  - persist sdoc metadata
  - persist tags
  - persist sdoc links
  - persist span annotations
  - persist word_frequencies
- resolve_sdoc_links
- store_document_in_elasticsearch
- index_text_document_for_simsearch
- update_sdoc_status_to_finish
- create_ppj_from_extracted_images

## Image Pipeline

### Extraction / Init

- create_ppid

### Processing

- create_image_metadata TODO rename to extract
- convert_to_webp_and_generate_thumbnails
- run_object_detection
- generate_image_caption

### Storage

- remove_erroneous_or_unfinished_sdocs
- write_ppid_to_database
  - \_create_and_persist_sdoc
  - \_persist_bbox\_\_annotations TODO rename
- index_image_document_for_simsearch

### Text pipeline

- create_pptd_from_caption
- run_spacy_pipeline
- generate_word_frequncies
- generate_keywords
- generate_sentence_annotations

### Storage 2

- TODO: Fehlt hier remove_erroneous_or_unfinished_sdocs?
- store_document_in_elasticsearch
- store_metadata_and_data_to_database
  - \_persist_sdoc_metadata
  - persist_sdoc_data
  - persist_tags
  - \_persist_sdoc_word_frequencies
- resolve_sdoc_links
- update_sdoc_status_to_finish

## Audio Pipeline

### Extraction / Init

- create_ppad

### Processing

- create_ffmpeg_probe_audio_metadata TODO Rename extract audio metadata
- convert_to_pcm
- generate_webp_thumbnail_for_audio TODO Skip? seems unnecessary right now
- generate_automatic_transcription TODO rename generate transcription

### Storage

- TODO: Warum fehlt hier remove_erroneous_or_unfinished_sdocs
- write_ppad_to_database

### Text Pipeline

- create_pptd_from_transcription
- extract_text_from_html_and_create_source_mapping
- detect_content_language
- run_spacy_pipeline
- generate_word_frequncies
- generate_keywords
- generate_sentence_annotations
- TODO Missing: generate_named_entity_annotations
- TODO Missing: apply_html_source_mapping_with_custom_html_tags

### Storage 2

- TODO warum ist das nun hier? remove_erroneous_or_unfinished_sdocs
  TODO Missing write_pptd_to_database?
- store_metadata_and_data_to_database
  - persist_sdoc_data
  - \_persist_sdoc_metadata
  - persist_tags
  - \_persist_sdoc_word_frequencies
- resolve_sdoc_links
- store_document_in_elasticsearch
- TODO Missing: index_text_document_for_simsearch
- update_sdoc_status_to_finish

## Video Pipeline

### Extraction / Init

- create_ppvd

### Processing

- create_ffmpeg_probe_video_metadata TODO Rename extract video metadata
- generate_webp_thumbnail_for_video TODO Remove? I think it is not used?

### Storage

- create_and_store_audio_stream_file
- TODO: WRONG PLACE? create_ppad_from_video
- TODO: Warum hier kein remove erroneous?
- write_ppvd_to_database

### Audio Pipeline

- create_ffmpeg_probe_audio_metadata
- convert_to_pcm
- TODO: hier wird kein thumbnail generiert?
- generate_automatic_transcription

### Text Pipeline

- create_pptd_from_transcription
- detect_content_language
- run_spacy_pipeline
- generate_word_frequncies TODO Rename fix spelling mistake
- generate_keywords
- generate_sentence_annotations

### Storage 2

- store_document_in_elasticsearch
- store_metadata_and_data_to_database
  - \_persist_sdoc_metadata
  - persist_tags
  - persist_sdoc_data
  - \_persist_sdoc_word_frequencies
- TODO: Muss das nicht an den anfang? remove_erroneous_or_unfinished_sdocs
- resolve_sdoc_links
- update_sdoc_status_to_finish
