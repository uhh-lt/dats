from typing import List

from bs4 import BeautifulSoup
from config import conf
from core.doc.source_document_link_dto import SourceDocumentLinkCreate
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from repos.filesystem_repo import FilesystemRepo

cc = conf.celery
fsr: FilesystemRepo = FilesystemRepo()


def extract_sdoc_links_from_html_of_mixed_documents(
    cargo: PipelineCargo,
) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    create_dtos: List[SourceDocumentLinkCreate] = []
    soup = BeautifulSoup(pptd.html, "html.parser")

    # extract and create text -> image links
    filepath = pptd.filepath
    if filepath.suffix == ".pdf" and not cc.preprocessing.extract_images_from_pdf:
        create_dtos = []
    elif filepath.suffix == ".docx" and not cc.preprocessing.extract_images_from_docx:
        create_dtos = []
    else:
        img_links = soup.findAll("img")  # type: ignore
        img_srcs = set([img["src"].strip() for img in img_links if img.has_attr("src")])
        for img_src in img_srcs:
            create_dtos.append(
                SourceDocumentLinkCreate(
                    parent_source_document_id=None,
                    linked_source_document_filename=fsr.truncate_filename(img_src),
                )
            )

    # extract and create text -> audio links
    audio_links = soup.findAll("audio")  # type: ignore
    for audio in audio_links:
        sources = audio.findChildren("source")
        if len(sources) > 0:
            audio_links.append(sources[0])
    audio_srcs = set(
        [audio["src"].strip() for audio in audio_links if audio.has_attr("src")]
    )
    for audio_src in audio_srcs:
        create_dtos.append(
            SourceDocumentLinkCreate(
                parent_source_document_id=None,
                linked_source_document_filename=fsr.truncate_filename(audio_src),
            )
        )

    # extract and create text -> video links
    video_links = soup.findAll("video")  # type: ignore
    for video in video_links:
        sources = video.findChildren("source")
        if len(sources) > 0:
            video_links.append(sources[0])
    video_srcs = set(
        [video["src"].strip() for video in video_links if video.has_attr("src")]
    )
    for video_src in video_srcs:
        create_dtos.append(
            SourceDocumentLinkCreate(
                parent_source_document_id=None,
                linked_source_document_filename=fsr.truncate_filename(video_src),
            )
        )

    pptd.sdoc_link_create_dtos = create_dtos
    return cargo
