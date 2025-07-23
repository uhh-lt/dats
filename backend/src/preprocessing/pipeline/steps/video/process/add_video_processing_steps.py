from preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


def add_video_processing_steps(pipeline: PreprocessingPipeline) -> None:
    from preprocessing.pipeline.steps.video.process.create_and_store_audio_stream_file import (
        create_and_store_audio_stream_file,
    )
    from preprocessing.pipeline.steps.video.process.create_ffmpeg_probe_video_metadata import (
        create_ffmpeg_probe_video_metadata,
    )
    from preprocessing.pipeline.steps.video.process.generate_webp_thumbnail_for_video import (
        generate_webp_thumbnail_for_video,
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
