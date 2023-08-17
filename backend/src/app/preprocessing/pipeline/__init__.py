from functools import lru_cache

from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


@lru_cache(maxsize=1)
def build_text_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    from app.preprocessing.pipeline.steps.text.apply_html_source_mapping_with_custom_html_tags import (
        apply_html_source_mapping_with_custom_html_tags,
    )
    from app.preprocessing.pipeline.steps.text.clean_html import clean_content_in_html
    from app.preprocessing.pipeline.steps.text.create_pptd import create_pptd
    from app.preprocessing.pipeline.steps.text.detect_content_language import (
        detect_content_language,
    )
    from app.preprocessing.pipeline.steps.text.extract_content_in_html_from_word_or_pdf_docs import (
        extract_content_in_html_from_word_or_pdf_docs,
    )
    from app.preprocessing.pipeline.steps.text.extract_text_from_html_and_create_source_mapping import (
        extract_text_from_html_and_create_source_mapping,
    )
    from app.preprocessing.pipeline.steps.text.generate_content_in_html_from_raw_text_docs import (
        extract_content_in_html_from_raw_text_docs,
    )
    from app.preprocessing.pipeline.steps.text.generate_named_entity_annotations import (
        generate_named_entity_annotations,
    )
    from app.preprocessing.pipeline.steps.text.generate_sentence_annotations import (
        generate_sentence_annotations,
    )
    from app.preprocessing.pipeline.steps.text.generate_word_frequencies import (
        generate_word_frequncies,
    )
    from app.preprocessing.pipeline.steps.text.index_text_document_in_faiss import (
        index_text_document_in_faiss,
    )
    from app.preprocessing.pipeline.steps.text.resolve_sdoc_links import (
        resolve_sdoc_links,
    )
    from app.preprocessing.pipeline.steps.text.run_spacy_pipeline import (
        run_spacy_pipeline,
    )
    from app.preprocessing.pipeline.steps.text.store_document_in_elasticsearch import (
        store_document_in_elasticsearch,
    )
    from app.preprocessing.pipeline.steps.text.update_pptd_sdoc_status_to_finish import (
        update_pptd_sdoc_status_to_finish,
    )
    from app.preprocessing.pipeline.steps.text.write_pptd_to_database import (
        write_pptd_to_database,
    )

    pipeline = PreprocessingPipeline(num_workers=1, force_sequential=True)

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
        func=generate_word_frequncies,
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
        func=write_pptd_to_database,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=resolve_sdoc_links,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=store_document_in_elasticsearch,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=index_text_document_in_faiss,
        required_data=["pptd"],
    )

    pipeline.register_step(
        func=update_pptd_sdoc_status_to_finish,
        required_data=["pptd"],
    )

    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_image_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    pipeline = PreprocessingPipeline(num_workers=1, force_sequential=True)
    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_audio_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    pipeline = PreprocessingPipeline(num_workers=1, force_sequential=True)
    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_video_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    pipeline = PreprocessingPipeline(num_workers=1, force_sequential=True)
    pipeline.freeze()

    return pipeline
