from functools import lru_cache

from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


@lru_cache(maxsize=1)
def build_text_pipeline(foo: str = "bar") -> PreprocessingPipeline:
    pipeline = PreprocessingPipeline(num_workers=1, force_sequential=True)
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
