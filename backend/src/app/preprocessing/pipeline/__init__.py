from functools import lru_cache

from app.core.data.doc_type import DocType
from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from app.preprocessing.pipeline.steps.audio.process.add_audio_processing_steps import (
    add_audio_processing_steps,
)
from app.preprocessing.pipeline.steps.common.finalize.add_finalize_pipeline_steps import (
    add_finalize_pipeline_steps,
)
from app.preprocessing.pipeline.steps.common.storage.add_common_storage_steps import (
    add_common_storage_steps,
)
from app.preprocessing.pipeline.steps.image.process.add_image_processing_steps import (
    add_image_processing_steps,
)
from app.preprocessing.pipeline.steps.image.storage.add_image_storage_steps import (
    add_image_storage_steps,
)
from app.preprocessing.pipeline.steps.text.init.add_text_init_steps import (
    add_text_init_steps,
)
from app.preprocessing.pipeline.steps.text.process.add_text_processing_steps import (
    add_text_processing_steps,
)
from app.preprocessing.pipeline.steps.text.storage.add_text_storage_steps import (
    add_text_storage_steps,
)
from app.preprocessing.pipeline.steps.video.process.add_video_processing_steps import (
    add_video_processing_steps,
)


@lru_cache(maxsize=1)
def build_text_pipeline(
    is_init: bool = True,
) -> PreprocessingPipeline:
    from app.preprocessing.pipeline.steps.text.create_ppj_from_extracted_images import (
        create_ppj_from_extracted_images,
    )

    pipeline = PreprocessingPipeline(doc_type=DocType.text)

    add_text_init_steps(pipeline=pipeline)

    add_text_processing_steps(pipeline=pipeline, is_init=is_init)

    add_common_storage_steps(pipeline=pipeline)

    add_text_storage_steps(pipeline=pipeline)

    add_finalize_pipeline_steps(pipeline=pipeline)

    if is_init:
        pipeline.register_step(
            func=create_ppj_from_extracted_images,
            required_data=["pptd"],
        )

    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_image_pipeline(
    is_init: bool = True,
) -> PreprocessingPipeline:
    from app.preprocessing.pipeline.steps.image.copy_keyword_to_ppid_metadata import (
        copy_keyword_to_ppid_metadata,
    )
    from app.preprocessing.pipeline.steps.image.create_pptd_from_description import (
        create_pptd_from_description,
    )
    from app.preprocessing.pipeline.steps.image.init.create_ppid import (
        create_ppid,
    )

    pipeline = PreprocessingPipeline(doc_type=DocType.image)

    pipeline.register_step(
        func=create_ppid,
        required_data=[],
    )

    add_image_processing_steps(pipeline=pipeline)

    pipeline.register_step(
        func=create_pptd_from_description,
        required_data=["ppid"],
    )

    add_text_processing_steps(pipeline=pipeline, is_init=is_init)

    pipeline.register_step(
        func=copy_keyword_to_ppid_metadata,
        required_data=["pptd", "ppid"],
    )

    add_common_storage_steps(pipeline=pipeline)

    add_text_storage_steps(pipeline=pipeline)

    add_image_storage_steps(pipeline=pipeline)

    add_finalize_pipeline_steps(pipeline=pipeline)

    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_audio_pipeline(is_init: bool = True) -> PreprocessingPipeline:
    # we need to import the steps here to avoid loading models at startup
    # in the api worker!
    from app.preprocessing.pipeline.steps.audio.copy_pptd_to_ppad_metadata import (
        copy_pptd_to_ppad_metadata,
    )
    from app.preprocessing.pipeline.steps.audio.create_pptd_from_transcription import (
        create_pptd_from_transcription,
    )
    from app.preprocessing.pipeline.steps.audio.init.create_ppad import create_ppad

    pipeline = PreprocessingPipeline(doc_type=DocType.audio)

    pipeline.register_step(
        func=create_ppad,
        required_data=[],
    )

    add_audio_processing_steps(pipeline=pipeline)

    pipeline.register_step(
        func=create_pptd_from_transcription,
        required_data=["ppad"],
    )

    add_text_processing_steps(pipeline=pipeline, is_init=is_init)

    pipeline.register_step(
        func=copy_pptd_to_ppad_metadata,
        required_data=["pptd", "ppad"],
    )

    add_common_storage_steps(pipeline=pipeline)

    add_text_storage_steps(pipeline=pipeline)

    add_finalize_pipeline_steps(pipeline=pipeline)

    pipeline.freeze()

    return pipeline


@lru_cache(maxsize=1)
def build_video_pipeline(
    is_init: bool = True,
) -> PreprocessingPipeline:
    from app.preprocessing.pipeline.steps.audio.create_pptd_from_transcription import (
        create_pptd_from_transcription,
    )
    from app.preprocessing.pipeline.steps.text.process.add_text_processing_steps import (
        add_text_processing_steps,
    )
    from app.preprocessing.pipeline.steps.video.copy_pptd_to_ppvd_metadata import (
        copy_pptd_to_ppvd_metadata,
    )
    from app.preprocessing.pipeline.steps.video.create_ppad_from_video import (
        create_ppad_from_video,
    )
    from app.preprocessing.pipeline.steps.video.init.create_ppvd import create_ppvd

    pipeline = PreprocessingPipeline(doc_type=DocType.video)

    pipeline.register_step(
        func=create_ppvd,
        required_data=[],
    )

    add_video_processing_steps(pipeline=pipeline)

    pipeline.register_step(
        func=create_ppad_from_video,
        required_data=["ppvd"],
    )

    add_audio_processing_steps(pipeline=pipeline)

    pipeline.register_step(
        func=create_pptd_from_transcription,
        required_data=["ppad"],
    )

    add_text_processing_steps(pipeline=pipeline, is_init=is_init)

    pipeline.register_step(
        func=copy_pptd_to_ppvd_metadata,
        required_data=["pptd", "ppvd"],
    )

    add_common_storage_steps(pipeline=pipeline)

    add_text_storage_steps(pipeline=pipeline)

    add_finalize_pipeline_steps(pipeline=pipeline)

    pipeline.freeze()

    return pipeline
