from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


def add_audio_processing_steps(pipeline: PreprocessingPipeline) -> None:
    from app.preprocessing.pipeline.steps.audio.process.convert_to_pcm import (
        convert_to_pcm,
    )
    from app.preprocessing.pipeline.steps.audio.process.create_ffmpeg_probe_audio_metadata import (
        create_ffmpeg_probe_audio_metadata,
    )
    from app.preprocessing.pipeline.steps.audio.process.generate_automatic_transcription import (
        generate_automatic_transcription,
    )
    from app.preprocessing.pipeline.steps.audio.process.generate_webp_thumbnail_for_audio import (
        generate_webp_thumbnail_for_audio,
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
