from typing import Any, Callable, Dict, List, Tuple

from common.doc_type import DocType
from common.job_type import JobType
from modules.crawler.crawler_job import CrawlerJobInput, CrawlerJobOutput
from modules.doc_audio_processing.audio_metadata_extraction_job import (
    AudioMetadataExtractionJobInput,
)
from modules.doc_audio_processing.audio_thumbnail_generation_job import (
    AudioThumbnailJobInput,
)
from modules.doc_audio_processing.transcription_job import (
    TranscriptionJobInput,
    TranscriptionJobOutput,
)
from modules.doc_image_processing.image_caption_job import (
    ImageCaptionJobInput,
    ImageCaptionJobOutput,
)
from modules.doc_image_processing.image_embedding_job import ImageEmbeddingJobInput
from modules.doc_image_processing.image_metadata_extraction_job import (
    ImageMetadataExtractionJobInput,
)
from modules.doc_image_processing.image_thumbnail_generation_job import (
    ImageThumbnailJobInput,
)
from modules.doc_processing.archive_extraction_job import (
    ArchiveExtractionJobInput,
    ArchiveExtractionJobOutput,
)
from modules.doc_processing.doc_chunking_job import (
    DocChunkingJobInput,
    DocChunkingJobOutput,
)
from modules.doc_processing.init_sdoc_job import (
    SdocInitJobInput,
    SdocInitJobOutput,
)
from modules.doc_text_processing.detect_language_job import (
    TextLanguageDetectionJobInput,
    TextLanguageDetectionJobOutput,
)
from modules.doc_text_processing.es_index_job import TextESIndexJobInput
from modules.doc_text_processing.html_extraction_job import (
    ExtractHTMLJobInput,
    ExtractHTMLJobOutput,
)
from modules.doc_text_processing.html_mapping_job import (
    TextExtractionJobInput,
    TextExtractionJobOutput,
    TextHTMLMappingJobInput,
)
from modules.doc_text_processing.sentence_embedding_job import (
    TextSentenceEmbeddingJobInput,
)
from modules.doc_text_processing.spacy_job import (
    SpacyJobInput,
    SpacyJobOutput,
)
from modules.doc_video_processing.video_audio_extraction_job import (
    VideoAudioExtractionJobInput,
    VideoAudioExtractionJobOutput,
)


# --- Operator Classes ---
class SwitchCaseBranchOperator:
    def __init__(
        self,
        switch_variable: Callable[[Any], Any],
        cases: Dict[Any, List[Tuple[Callable, JobType]]],
    ):
        self.switch_variable = switch_variable
        self.cases = cases

    def get_next_jobs(self, input, output):
        key = self.switch_variable(output)
        return self.cases.get(key, [])


class LoopBranchOperator:
    def __init__(
        self,
        loop_variable: Callable[[Any], List[Any]],
        next_jobs: List[Tuple[Callable, JobType]],
    ):
        self.loop_variable = loop_variable
        self.next_jobs = next_jobs

    def get_next_jobs(self, input, output):
        items = self.loop_variable(output)
        jobs = []
        for idx, item in enumerate(items):
            for transition_fn, job_type in self.next_jobs:
                jobs.append((transition_fn, job_type, idx))
        return jobs


# --- Transition Functions ---
def crawler_to_extract_archive(input, output):
    from modules.doc_processing.archive_extraction_job import ArchiveExtractionJobInput

    assert isinstance(input, CrawlerJobInput), "Expected CrawlerJobInput"
    assert isinstance(output, CrawlerJobOutput), "Expected CrawlerJobOutput"
    return ArchiveExtractionJobInput(
        project_id=input.project_id, filepath=output.crawled_data_zip
    )


def extract_archive_to_pdf_chunking(input, output, idx):
    assert isinstance(input, ArchiveExtractionJobInput), (
        "Expected ArchiveExtractionJobInput"
    )
    assert isinstance(output, ArchiveExtractionJobOutput), (
        "Expected ArchiveExtractionJobOutput"
    )
    path = output.file_paths[idx]
    return DocChunkingJobInput(project_id=input.project_id, filepath=path)


def pdf_chunking_to_sdoc_init(input, output, idx):
    assert isinstance(input, DocChunkingJobInput), "Expected PDFChunkingJobInput"
    assert isinstance(output, DocChunkingJobOutput), "Expected PDFChunkingJobOutput"
    path = output.files[idx]
    return SdocInitJobInput(
        project_id=input.project_id,
        doctype=DocType.text,
        filepath=path,
        folder_id=output.folder_id,
    )


def extract_html_to_text_extraction(input, output):
    assert isinstance(input, ExtractHTMLJobInput), "Expected ExtractHTMLJobInput"
    assert isinstance(output, ExtractHTMLJobOutput), "Expected ExtractHTMLJobOutput"
    return TextExtractionJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        html=output.html,
        filename=input.filepath.name,
        doctype=input.doctype,
    )


def extract_html_to_image_sdoc_init(input, output, idx):
    assert isinstance(input, ExtractHTMLJobInput), "Expected ExtractHTMLJobInput"
    assert isinstance(output, ExtractHTMLJobOutput), "Expected ExtractHTMLJobOutput"
    path = output.image_paths[idx]
    return SdocInitJobInput(
        project_id=input.project_id,
        filepath=path,
        folder_id=output.folder_id,
        doctype=DocType.image,
    )


def text_extraction_to_language_detection(input, output):
    assert isinstance(input, TextExtractionJobInput), "Expected TextExtractionJobInput"
    assert isinstance(output, TextExtractionJobOutput), (
        "Expected TextExtractionJobOutput"
    )
    return TextLanguageDetectionJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        text=output.text,
        doctype=input.doctype,
        html=input.html,
    )


def text_extraction_to_es_index(input, output):
    assert isinstance(input, TextExtractionJobInput), "Expected TextExtractionJobInput"
    assert isinstance(output, TextExtractionJobOutput), (
        "Expected TextExtractionJobOutput"
    )
    return TextESIndexJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        text=output.text,
        filename=input.filename,
    )


def language_detection_to_spacy(input, output):
    assert isinstance(input, TextLanguageDetectionJobInput), (
        "Expected TextLanguageDetectionJobInput"
    )
    assert isinstance(output, TextLanguageDetectionJobOutput), (
        "Expected TextLanguageDetectionJobOutput"
    )
    return SpacyJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        text=output.text,
        doctype=input.doctype,
        language=output.language,
        html=input.html,
    )


def spacy_to_html_mapping(input, output):
    assert isinstance(input, SpacyJobInput), "Expected SpacyJobInput"
    assert isinstance(output, SpacyJobOutput), "Expected SpacyJobOutput"
    return TextHTMLMappingJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        raw_html=input.html,
        sentence_starts=output.sentence_starts,
        sentence_ends=output.sentence_ends,
        token_starts=output.token_starts,
        token_ends=output.token_ends,
    )


def spacy_to_sentence_embedding(input, output):
    assert isinstance(input, SpacyJobInput), "Expected SpacyJobInput"
    assert isinstance(output, SpacyJobOutput), "Expected SpacyJobOutput"
    return TextSentenceEmbeddingJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        sentences=output.sentences,
    )


def video_audio_extraction_to_audio_transcription(input, output):
    assert isinstance(input, VideoAudioExtractionJobInput), (
        "Expected VideoAudioExtractionJobInput"
    )
    assert isinstance(output, VideoAudioExtractionJobOutput), (
        "Expected VideoAudioExtractionJobOutput"
    )
    return TranscriptionJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        filepath=output.filepath,
    )


def audio_transcription_to_text_extraction(input, output):
    assert isinstance(input, TranscriptionJobInput), "Expected TranscriptionJobInput"
    assert isinstance(output, TranscriptionJobOutput), "Expected TranscriptionJobOutput"
    return TextExtractionJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        html=output.html,
        filename=input.filepath.name,
        doctype=DocType.audio,
    )


def image_caption_to_text_extraction(input, output):
    assert isinstance(input, ImageCaptionJobInput), "Expected ImageCaptionJobInput"
    assert isinstance(output, ImageCaptionJobOutput), "Expected ImageCaptionJobOutput"
    return TextExtractionJobInput(
        project_id=input.project_id,
        sdoc_id=input.sdoc_id,
        html=output.html,
        filename=input.filepath.name,
        doctype=DocType.image,
    )


def sdoc_init_to_extract_html(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return ExtractHTMLJobInput(
        project_id=input.project_id,
        sdoc_id=output.sdoc_id,
        filepath=input.filepath,
        doctype=DocType.text,
        folder_id=output.folder_id,
    )


def extract_archive_to_sdoc_init(input, output, idx):
    assert isinstance(input, ArchiveExtractionJobInput), (
        "Expected ArchiveExtractionJobInput"
    )
    assert isinstance(output, ArchiveExtractionJobOutput), (
        "Expected ArchiveExtractionJobOutput"
    )
    path = output.file_paths[idx]
    doctype = output.doctypes[idx]
    return SdocInitJobInput(
        project_id=input.project_id,
        doctype=doctype,
        filepath=path,
        folder_id=None,
    )


def sdoc_init_to_image_caption(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return ImageCaptionJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )


def sdoc_init_to_image_embedding(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return ImageEmbeddingJobInput(project_id=input.project_id, sdoc_id=output.sdoc_id)


def sdoc_init_to_image_metadata_extraction(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return ImageMetadataExtractionJobInput(
        project_id=input.project_id,
        sdoc_id=output.sdoc_id,
        filepath=input.filepath,
        doctype=input.doctype,
    )


def sdoc_init_to_image_thumbnail(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return ImageThumbnailJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )


def sdoc_init_to_audio_metadata_extraction(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return AudioMetadataExtractionJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )


def sdoc_init_to_audio_transcription(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return TranscriptionJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )


def sdoc_init_to_audio_thumbnail(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return AudioThumbnailJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )


def sdoc_init_to_video_metadata_extraction(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return AudioMetadataExtractionJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )


def sdoc_init_to_video_thumbnail(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return AudioThumbnailJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )


def sdoc_init_to_video_audio_extraction(input, output):
    assert isinstance(input, SdocInitJobInput), "Expected SdocInitJobInput"
    assert isinstance(output, SdocInitJobOutput), "Expected SdocInitJobOutput"
    return VideoAudioExtractionJobInput(
        project_id=input.project_id, sdoc_id=output.sdoc_id, filepath=input.filepath
    )
