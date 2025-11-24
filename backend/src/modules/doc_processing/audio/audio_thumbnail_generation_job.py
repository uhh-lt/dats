from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class AudioThumbnailJobInput(SdocProcessingJobInput):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> AudioThumbnailJobInput:
    with sqlr.db_session() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.audio, (
            f"SourceDocument with {payload.sdoc_id=} is not an audio file!"
        )

    audio_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return AudioThumbnailJobInput(
        **payload.model_dump(),
        filepath=audio_path,
    )


@register_job(
    job_type=JobType.AUDIO_THUMBNAIL,
    input_type=AudioThumbnailJobInput,
    enricher=enrich_for_recompute,
)
def handle_audio_thumbnail_job(payload: AudioThumbnailJobInput, job: Job) -> None:
    thumbnail_filename = fsr.generate_sdoc_filename(
        payload.filepath, webp=True, thumbnail=True
    )
    print(thumbnail_filename)

    webp_filename = fsr.generate_sdoc_filename(
        payload.filepath, webp=True, thumbnail=False
    )
    print(webp_filename)

    # Store link to webp image in DB
    # with sqlr.db_session() as db:
    #     sdoc = SourceDocumentRead.model_validate(
    #         crud_sdoc.read(db=db, id=payload.sdoc_id)
    #     )
    #     repo_url = FilesystemRepo().get_sdoc_url(
    #         sdoc=sdoc,
    #         relative=True,
    #         webp=True,
    #         thumbnail=False,
    #     )
    #     crud_sdoc_data.update(
    #         db=db,
    #         id=payload.sdoc_id,
    #         update_dto=SourceDocumentDataUpdate(repo_url=repo_url),
    #     )

    # TODO: Implement correctly!

    # create a thumbnail from the audio file
    # Needs to be re-implemented, the original code was extremely slow and inefficient

    # read values from wav file
    # wav_obj = wave.open(str(payload.uncompressed_audio_filepath), "rb")
    # sample_freq = wav_obj.getframerate()
    # n_samples = wav_obj.getnframes()
    # signal_wave = wav_obj.readframes(n_samples)
    # signal_array = np.frombuffer(signal_wave, dtype=np.int16)

    # # plot wav file and save as webp
    # times = np.linspace(0, n_samples / sample_freq, num=n_samples)
    # plt.figure(figsize=(15, 5))
    # plt.plot(times, signal_array, "grey")
    # plt.axis("off")
    # plt.margins(0, 0)
    # plt.savefig(
    #     str(thumbnail_filename), bbox_inches="tight", pad_inches=0, transparent=True
    # )

    # plt.figure(figsize=(75, 35))
    # plt.plot(times, signal_array, "grey")
    # plt.axis("off")
    # plt.margins(0, 0)
    # plt.savefig(str(webp_filename), bbox_inches="tight", pad_inches=0, transparent=True)
