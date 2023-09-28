from functools import lru_cache

from app.core.data.doc_type import DocType
from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from config import conf

cc = conf.preprocessing


@lru_cache(maxsize=1)
def build_text_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    from app.preprocessing.pipeline.steps.common.remove_erroneous_sdoc import (
        remove_erroneous_or_unfinished_sdocs,
    )
    from app.preprocessing.pipeline.steps.common.resolve_sdoc_links import (
        resolve_sdoc_links,
    )
    from app.preprocessing.pipeline.steps.common.update_sdoc_status_to_finish import (
        update_sdoc_status_to_finish,
    )
    from app.preprocessing.pipeline.steps.text.apply_html_source_mapping_with_custom_html_tags import (
        apply_html_source_mapping_with_custom_html_tags,
    )
    from app.preprocessing.pipeline.steps.text.clean_html import clean_content_in_html
    from app.preprocessing.pipeline.steps.text.create_pptd import create_pptd
    from app.preprocessing.pipeline.steps.text.detect_content_language import (
        detect_content_language,
    )
    from app.preprocessing.pipeline.steps.text.extract_content_in_html_from_raw_text_docs import (
        extract_content_in_html_from_raw_text_docs,
    )
    from app.preprocessing.pipeline.steps.text.extract_content_in_html_from_word_or_pdf_docs import (
        extract_content_in_html_from_word_or_pdf_docs,
    )
    from app.preprocessing.pipeline.steps.text.extract_sdoc_links_from_html_of_mixed_documents import (
        extract_sdoc_links_from_html_of_mixed_documents,
    )
    from app.preprocessing.pipeline.steps.text.extract_text_from_html_and_create_source_mapping import (
        extract_text_from_html_and_create_source_mapping,
    )
    from app.preprocessing.pipeline.steps.text.generate_named_entity_annotations import (
        generate_named_entity_annotations,
    )
    from app.preprocessing.pipeline.steps.text.generate_sentence_annotations import (
        generate_sentence_annotations,
    )
    from app.preprocessing.pipeline.steps.text.generate_word_frequencies_and_keywords import (
        generate_word_frequncies_and_keywords,
    )
    from app.preprocessing.pipeline.steps.text.index_text_document_in_faiss import (
        index_text_document_in_faiss,
    )
    from app.preprocessing.pipeline.steps.text.run_spacy_pipeline import (
        run_spacy_pipeline,
    )
    from app.preprocessing.pipeline.steps.text.store_document_in_elasticsearch import (
        store_document_in_elasticsearch,
    )
    from app.preprocessing.pipeline.steps.text.write_pptd_to_database import (
        write_pptd_to_database,
    )

    pipeline = PreprocessingPipeline(
        doc_type=DocType.text, num_workers=cc.text.num_workers, force_sequential=False
    )

    pipeline.register_step(
        func=create_pptd,
        required_data=[],
    )

    pipeline.register_step(
        required_data=["pptd"],
        func=extract_content_in_html_from_word_or_pdf_docs,
    )

    pipeline.register_step(
        required_data=["pptd"],
        func=extract_content_in_html_from_raw_text_docs,
    )

    pipeline.register_step(
        func=clean_content_in_html,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=extract_text_from_html_and_create_source_mapping,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=detect_content_language,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=run_spacy_pipeline,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=generate_word_frequncies_and_keywords,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=generate_sentence_annotations,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=generate_named_entity_annotations,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=apply_html_source_mapping_with_custom_html_tags,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=extract_sdoc_links_from_html_of_mixed_documents,
        required_data=["pptd"],
    )

    pipeline.register_step(
        # this method should be called before writing a document to the database.
        # So in case the document is already in the database but not finished
        # or erroneous, we remove it to make the preprocessing idempotent.
        func=remove_erroneous_or_unfinished_sdocs,
    )

    pipeline.register_step(
        func=write_pptd_to_database,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=resolve_sdoc_links,
    )

    pipeline.register_step(
        func=store_document_in_elasticsearch,
        required_data=["pptd", "sdoc_id"],
    )

    pipeline.register_step(
        func=index_text_document_in_faiss,
        required_data=["pptd", "sdoc_id"],
    )

    pipeline.register_step(
        func=update_sdoc_status_to_finish,
        required_data=["pptd", "sdoc_id"],
    )

    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_image_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    from app.preprocessing.pipeline.steps.common.remove_erroneous_sdoc import (
        remove_erroneous_or_unfinished_sdocs,
    )
    from app.preprocessing.pipeline.steps.common.resolve_sdoc_links import (
        resolve_sdoc_links,
    )
    from app.preprocessing.pipeline.steps.common.update_sdoc_status_to_finish import (
        update_sdoc_status_to_finish,
    )
    from app.preprocessing.pipeline.steps.image.convert_to_webp_and_generate_thumbnail import (
        convert_to_webp_and_generate_thumbnails,
    )
    from app.preprocessing.pipeline.steps.image.create_image_metadata import (
        create_image_metadata,
    )
    from app.preprocessing.pipeline.steps.image.create_ppid import create_ppid
    from app.preprocessing.pipeline.steps.image.create_pptd_from_caption import (
        create_pptd_from_caption,
    )
    from app.preprocessing.pipeline.steps.image.generate_image_caption import (
        generate_image_caption,
    )
    from app.preprocessing.pipeline.steps.image.index_image_in_faiss import (
        index_image_in_faiss,
    )
    from app.preprocessing.pipeline.steps.image.run_object_detection import (
        run_object_detection,
    )
    from app.preprocessing.pipeline.steps.image.write_ppid_to_database import (
        write_ppid_to_database,
    )
    from app.preprocessing.pipeline.steps.text.generate_sentence_annotations import (
        generate_sentence_annotations,
    )
    from app.preprocessing.pipeline.steps.text.generate_word_frequencies_and_keywords import (
        generate_word_frequncies_and_keywords,
    )
    from app.preprocessing.pipeline.steps.text.run_spacy_pipeline import (
        run_spacy_pipeline,
    )
    from app.preprocessing.pipeline.steps.text.store_document_in_elasticsearch import (
        store_document_in_elasticsearch,
    )

    pipeline = PreprocessingPipeline(
        doc_type=DocType.image, num_workers=cc.image.num_workers, force_sequential=False
    )

    pipeline.register_step(
        func=create_ppid,
        required_data=[],
    )

    pipeline.register_step(
        func=create_image_metadata,
        required_data=["ppid"],
    )

    pipeline.register_step(
        func=convert_to_webp_and_generate_thumbnails,
        required_data=["ppid"],
    )

    pipeline.register_step(
        func=run_object_detection,
        required_data=["ppid"],
    )

    pipeline.register_step(
        func=generate_image_caption,
        required_data=["ppid"],
    )

    pipeline.register_step(
        # this method should be called before writing a document to the database.
        # So in case the document is already in the database but not finished
        # or erroneous, we remove it to make the preprocessing idempotent.
        func=remove_erroneous_or_unfinished_sdocs,
    )

    pipeline.register_step(
        func=write_ppid_to_database,
        required_data=["ppid"],
    )

    pipeline.register_step(
        func=index_image_in_faiss,
        required_data=["ppid", "sdoc_id"],
    )

    pipeline.register_step(
        func=create_pptd_from_caption,
        required_data=["ppid", "sdoc_id"],
    )

    # run caption through spacy and add to elasticsearch to make it searchable
    pipeline.register_step(
        func=run_spacy_pipeline,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=generate_word_frequncies_and_keywords,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=generate_sentence_annotations,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=store_document_in_elasticsearch,
        required_data=["pptd", "sdoc_id"],
    )

    pipeline.register_step(
        func=resolve_sdoc_links,
    )

    pipeline.register_step(
        func=update_sdoc_status_to_finish,
        required_data=["sdoc_id"],
    )

    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_audio_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    # we need to import the steps here to avoid loading models at startup
    # in the api worker!
    from app.preprocessing.pipeline.steps.audio.convert_to_pcm import convert_to_pcm
    from app.preprocessing.pipeline.steps.audio.create_and_store_transcript_file import (
        create_and_store_transcript_file,
    )
    from app.preprocessing.pipeline.steps.audio.create_ffmpeg_probe_audio_metadata import (
        create_ffmpeg_probe_audio_metadata,
    )
    from app.preprocessing.pipeline.steps.audio.create_ppad import create_ppad
    from app.preprocessing.pipeline.steps.audio.create_pptd_from_transcription import (
        create_pptd_from_transcription,
    )
    from app.preprocessing.pipeline.steps.audio.generate_automatic_transcription import (
        generate_automatic_transcription,
    )
    from app.preprocessing.pipeline.steps.audio.generate_webp_thumbnail_for_audio import (
        generate_webp_thumbnail_for_audio,
    )
    from app.preprocessing.pipeline.steps.audio.write_ppad_to_database import (
        write_ppad_to_database,
    )
    from app.preprocessing.pipeline.steps.common.remove_erroneous_sdoc import (
        remove_erroneous_or_unfinished_sdocs,
    )
    from app.preprocessing.pipeline.steps.common.resolve_sdoc_links import (
        resolve_sdoc_links,
    )
    from app.preprocessing.pipeline.steps.common.update_sdoc_status_to_finish import (
        update_sdoc_status_to_finish,
    )

    text_pipeline = build_text_pipeline()
    pipeline = PreprocessingPipeline(
        doc_type=DocType.audio, num_workers=cc.audio.num_workers, force_sequential=False
    )

    pipeline.register_step(
        func=create_ppad,
        required_data=[],
    )

    pipeline.register_step(
        func=create_ffmpeg_probe_audio_metadata,
        required_data=["ppad"],
    )

    pipeline.register_step(
        func=convert_to_pcm,
        required_data=["ppad"],
    )

    pipeline.register_step(
        func=generate_webp_thumbnail_for_audio,
        required_data=["ppad"],
    )

    pipeline.register_step(
        func=generate_automatic_transcription,
        required_data=["ppad"],
    )

    pipeline.register_step(
        func=create_and_store_transcript_file,
        required_data=["ppad"],
    )

    pipeline.register_step(
        func=create_pptd_from_transcription,
        required_data=["ppad"],
    )
    pipeline.join_pipeline(
        pipeline=text_pipeline,
        skip_steps_with_name=["create_pptd"],
    )

    pipeline.register_step(
        # this method should be called before writing a document to the database.
        # So in case the document is already in the database but not finished
        # or erroneous, we remove it to make the preprocessing idempotent.
        func=remove_erroneous_or_unfinished_sdocs,
    )

    pipeline.register_step(
        func=write_ppad_to_database,
        required_data=["ppad"],
    )

    pipeline.register_step(
        func=resolve_sdoc_links,
    )

    pipeline.register_step(
        func=update_sdoc_status_to_finish,
        required_data=["sdoc_id"],
    )

    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_video_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    from app.preprocessing.pipeline.steps.common.remove_erroneous_sdoc import (
        remove_erroneous_or_unfinished_sdocs,
    )
    from app.preprocessing.pipeline.steps.common.resolve_sdoc_links import (
        resolve_sdoc_links,
    )
    from app.preprocessing.pipeline.steps.common.update_sdoc_status_to_finish import (
        update_sdoc_status_to_finish,
    )
    from app.preprocessing.pipeline.steps.video.add_word_level_transcriptions_to_ppvd_metadata import (
        add_word_level_transcriptions_to_ppvd_metadata,
    )
    from app.preprocessing.pipeline.steps.video.create_and_store_audio_stream_file import (
        create_and_store_audio_stream_file,
    )
    from app.preprocessing.pipeline.steps.video.create_ffmpeg_probe_video_metadata import (
        create_ffmpeg_probe_video_metadata,
    )
    from app.preprocessing.pipeline.steps.video.create_ppad_from_video import (
        create_ppad_from_video,
    )
    from app.preprocessing.pipeline.steps.video.create_ppvd import create_ppvd
    from app.preprocessing.pipeline.steps.video.generate_webp_thumbnail_for_video import (
        generate_webp_thumbnail_for_video,
    )
    from app.preprocessing.pipeline.steps.video.write_ppvd_to_database import (
        write_ppvd_to_database,
    )

    audio_pipeline = build_audio_pipeline()
    pipeline = PreprocessingPipeline(
        doc_type=DocType.video, num_workers=cc.video.num_workers, force_sequential=False
    )

    pipeline.register_step(
        func=create_ppvd,
        required_data=[],
    )

    pipeline.register_step(
        func=create_ffmpeg_probe_video_metadata,
        required_data=["ppvd"],
    )

    pipeline.register_step(
        func=generate_webp_thumbnail_for_video,
        required_data=["ppvd"],
    )

    pipeline.register_step(
        func=create_and_store_audio_stream_file,
        required_data=["ppvd"],
    )

    pipeline.register_step(
        func=create_ppad_from_video,
        required_data=["ppvd"],
    )

    pipeline.join_pipeline(
        pipeline=audio_pipeline,
        skip_steps_with_name=["create_ppad"],
    )

    pipeline.register_step(
        func=add_word_level_transcriptions_to_ppvd_metadata,
        required_data=["ppvd", "ppad"],
    )

    pipeline.register_step(
        # this method should be called before writing a document to the database.
        # So in case the document is already in the database but not finished
        # or erroneous, we remove it to make the preprocessing idempotent.
        func=remove_erroneous_or_unfinished_sdocs,
    )

    pipeline.register_step(
        func=write_ppvd_to_database,
        required_data=["ppvd"],
    )

    pipeline.register_step(
        func=resolve_sdoc_links,
    )

    pipeline.register_step(
        func=update_sdoc_status_to_finish,
        required_data=["sdoc_id"],
    )

    pipeline.freeze()

    return pipeline
