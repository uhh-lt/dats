from preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


# Run text processing steps, that are shared in all modalities
def add_text_processing_steps(
    pipeline: PreprocessingPipeline,
    is_init: bool = True,
) -> None:
    from preprocessing.pipeline.steps.text.process.apply_html_source_mapping_with_custom_html_tags import (
        apply_html_source_mapping_with_custom_html_tags,
    )
    from preprocessing.pipeline.steps.text.process.detect_content_language import (
        detect_content_language,
    )
    from preprocessing.pipeline.steps.text.process.extract_sdoc_links_from_html_of_mixed_documents import (
        extract_sdoc_links_from_html_of_mixed_documents,
    )
    from preprocessing.pipeline.steps.text.process.extract_text_from_html_and_create_source_mapping import (
        extract_text_from_html_and_create_source_mapping,
    )
    from preprocessing.pipeline.steps.text.process.generate_keywords import (
        generate_keywords,
    )
    from preprocessing.pipeline.steps.text.process.generate_named_entity_annotations import (
        generate_named_entity_annotations,
    )
    from preprocessing.pipeline.steps.text.process.generate_sentence_annotations import (
        generate_sentence_annotations,
    )
    from preprocessing.pipeline.steps.text.process.generate_word_frequencies import (
        generate_word_frequncies,
    )
    from preprocessing.pipeline.steps.text.process.run_spacy_pipeline import (
        run_spacy_pipeline,
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
        func=generate_keywords,
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

    if is_init:
        pipeline.register_step(
            func=extract_sdoc_links_from_html_of_mixed_documents,
            required_data=["pptd"],
        )
