from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


def add_image_processing_steps(pipeline: PreprocessingPipeline) -> None:
    from app.preprocessing.pipeline.steps.image.process.convert_to_webp_and_generate_thumbnail import (
        convert_to_webp_and_generate_thumbnails,
    )
    from app.preprocessing.pipeline.steps.image.process.create_image_metadata import (
        create_image_metadata,
    )
    from app.preprocessing.pipeline.steps.image.process.generate_image_caption import (
        generate_image_caption,
    )
    from app.preprocessing.pipeline.steps.image.process.run_object_detection import (
        run_object_detection,
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
