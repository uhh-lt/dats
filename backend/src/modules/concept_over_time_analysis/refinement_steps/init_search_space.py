from datetime import datetime

from sqlalchemy.orm import Session

from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from modules.concept_over_time_analysis.cota_dto import (
    COTARead,
    COTASentence,
)
from modules.simsearch.simsearch_service import SimSearchService


def init_search_space(db: Session, cota: COTARead) -> list[COTASentence]:
    # the search space is not empty, we dont need to do anything
    if len(cota.search_space) > 0:
        return cota.search_space

    # the search space is empty, we build the search space with simsearch
    search_space_dict: dict[str, COTASentence] = (
        dict()
    )  # we use a dict here to prevent duplicates in the search space
    for concept in cota.concepts:
        # find similar sentences for each concept to define search space
        sents = SimSearchService().find_similar_sentences(
            sdoc_ids_to_search=None,
            proj_id=cota.project_id,
            query=concept.description,
            top_k=cota.training_settings.search_space_topk,
            threshold=cota.training_settings.search_space_threshold,
        )

        for sent in sents:
            cota_sentence_id = f"{sent.sentence_id}-{sent.sdoc_id}"
            cota_sentence = search_space_dict.get(
                cota_sentence_id,
                COTASentence(
                    sdoc_id=sent.sdoc_id,
                    sentence_id=sent.sentence_id,
                    concept_annotation=None,
                    concept_similarities={concept.id: 0.0 for concept in cota.concepts},
                    concept_probabilities={
                        concept.id: 1 / len(cota.concepts) for concept in cota.concepts
                    },
                    x=0.0,
                    y=0.0,
                    date=datetime.now(),
                    text="",
                ),
            )
            cota_sentence.concept_similarities[concept.id] = sent.score
            search_space_dict[cota_sentence_id] = cota_sentence

    search_space = list(search_space_dict.values())

    # add the sentences to the search space
    search_space = add_sentences_to_search_space(db=db, search_space=search_space)

    # add the date to the search space
    search_space = add_dates_to_search_space(
        db=db,
        date_metadata_id=cota.timeline_settings.date_metadata_id,
        search_space=search_space,
    )

    return search_space


def add_sentences_to_search_space(
    db: Session,
    search_space: list[COTASentence],
) -> list[COTASentence]:
    sdoc_ids = list(set([cota_sent.sdoc_id for cota_sent in search_space]))

    # get the data from the database
    sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)

    # map the data
    sdoc_id2sdocdata: dict[int, SourceDocumentDataORM] = {
        sdoc_data_read.id: sdoc_data_read
        for sdoc_data_read in sdoc_datas
        if sdoc_data_read is not None
    }

    sentences = []
    for cota_sent in search_space:
        if cota_sent.sdoc_id not in sdoc_id2sdocdata:
            raise ValueError(
                f"Could not find SourceDocumentDataORM for sdoc_id {cota_sent.sdoc_id}!"
            )
        sdoc_data_read = sdoc_id2sdocdata[cota_sent.sdoc_id]

        if cota_sent.sentence_id >= len(sdoc_data_read.sentences):
            raise ValueError(
                f"Could not find sentence with id {cota_sent.sentence_id} in SourceDocumentDataORM with id {sdoc_data_read.id}!"
            )
        sentences.append(sdoc_data_read.sentences[cota_sent.sentence_id])

    # add the sentences
    assert len(sentences) == len(search_space)
    for sentence, cota_sent in zip(sentences, search_space):
        cota_sent.text = sentence

    return search_space


def add_dates_to_search_space(
    db: Session, date_metadata_id: int | None, search_space: list[COTASentence]
) -> list[COTASentence]:
    sdoc_ids = list(set([cota_sent.sdoc_id for cota_sent in search_space]))

    # 2. find the date for every sdoc that is in the search space
    sdoc_id_to_date: dict[int, datetime] = dict()

    # this is only possible if the cota has a date_metadata_id
    if date_metadata_id is not None:
        query = (
            db.query(
                SourceDocumentORM.id,
                SourceDocumentMetadataORM.date_value,
            )
            .join(SourceDocumentORM.metadata_)
            .filter(
                SourceDocumentORM.id.in_(sdoc_ids),
                SourceDocumentMetadataORM.project_metadata_id == date_metadata_id,
                SourceDocumentMetadataORM.date_value.isnot(None),
            )
        )
        result_rows = query.all()

        for row in result_rows:
            sdoc_id_to_date[row[0]] = row[1]

    # otherwise, we set the date to today for every sdoc
    else:
        for sdoc_id in sdoc_ids:
            sdoc_id_to_date[sdoc_id] = datetime.now()

    # 3. update search_space with the date
    for sentence in search_space:
        sentence.date = sdoc_id_to_date[sentence.sdoc_id]

    return search_space
