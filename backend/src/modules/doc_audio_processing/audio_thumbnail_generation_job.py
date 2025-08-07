from pathlib import Path

from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class AudioThumbnailJobInput(JobInputBase):
    sdoc_id: int
    filepath: Path


@register_job(
    job_type="audio_thumbnail",
    input_type=AudioThumbnailJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
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

    with sqlr.db_session() as db:
        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(es_index=True),
        )
