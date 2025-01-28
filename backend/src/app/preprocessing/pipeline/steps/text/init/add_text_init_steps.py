from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


def add_text_init_steps(pipeline: PreprocessingPipeline) -> None:
    from app.preprocessing.pipeline.steps.text.init.clean_html import (
        clean_content_in_html,
    )
    from app.preprocessing.pipeline.steps.text.init.create_pptd import (
        create_pptd,
    )
    from app.preprocessing.pipeline.steps.text.init.extract_content_in_html_from_raw_text_docs import (
        extract_content_in_html_from_raw_text_docs,
    )
    from app.preprocessing.pipeline.steps.text.init.extract_content_in_html_from_word_or_pdf_docs import (
        extract_content_in_html_from_word_or_pdf_docs,
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
