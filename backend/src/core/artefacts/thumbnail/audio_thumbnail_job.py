from common.doc_type_enum import DocType
from core.artefacts.thumbnail.thumbnail_artefact import THUMBNAIL
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_file_crud import crud_sdoc_file
from repos.db.sql_repo import SQLRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class AudioThumbnailJobInput(SdocProcessingJobInput):
    filename: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> AudioThumbnailJobInput:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.audio, (
            f"SourceDocument with {payload.sdoc_id=} is not an audio file!"
        )

    assert crud_sdoc_file.exists(
        project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
    ), f"The file of SourceDocument {sdoc.id} does not exist!"
    return AudioThumbnailJobInput(**payload.model_dump(), filename=sdoc.filename)


@pipeline_step(
    requires=set(),
    produces={THUMBNAIL},
    doctypes={DocType.audio},
)
@register_job(
    job_type="audio_thumbnail",
    input_type=AudioThumbnailJobInput,
    enricher=enrich_for_recompute,
)
def handle_audio_thumbnail_job(payload: AudioThumbnailJobInput, job: Job) -> None:
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
    pass
