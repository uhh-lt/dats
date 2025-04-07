from html import unescape
from typing import List, Tuple

import spacy
from bertopic import BERTopic
from spacy.language import Language
from spacy_langdetect import LanguageDetector
from umap import UMAP

from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.topic_info import crud_topic_info
from app.core.data.dto.span_annotation import SpanAnnotationCreateIntern
from app.core.data.dto.topic_info import (
    TopicDocumentInfo,
    TopicInfoCreate,
    TopicWordInfo,
)
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.topic_info import TopicInfoORM
from app.core.db.sql_service import SQLService
from app.core.db.weaviate_service import WeaviateService
from app.util.singleton_meta import SingletonMeta


@Language.factory("language_detector")
def get_lang_detector(nlp, name):
    return LanguageDetector()


class TopicService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.ws: WeaviateService = WeaviateService()
        return super(TopicService, cls).__new__(cls)

    def perform_topic_modeling(
        self,
        project_id: int,
        nr_topics: int,
        min_topic_size: int,
        top_n_words: int,
        recompute: bool = False,
    ):
        text_data = []
        with self.sqls.db_session() as db:
            project = crud_project.read(db=db, id=project_id)
            sdoc_filenames = [
                x.filename for x in project.source_documents if x.data.content.strip()
            ]
            sdoc_ids = [
                x.id for x in project.source_documents if x.data.content.strip()
            ]

            # read all files
            doc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)
            for doc_data in doc_datas:
                # check for None
                if doc_data:
                    # check for empty content
                    if doc_data.content.strip():
                        text_data.append(doc_data.content)

        nlp = spacy.load("de_core_news_lg")
        print("nlp loaded...")

        nlp.add_pipe("language_detector", last=True)

        stopwords_file = (
            "/home/9scheld/dats/backend/src/app/core/ml/multi-languages.txt"
        )
        with open(stopwords_file, "r", encoding="utf-8") as file:
            custom_stopwords = list(file.read().splitlines())

        preprocessed_text_data = [
            self.preprocess_text(doc, nlp, custom_stopwords) for doc in text_data
        ]

        # get text embeddings
        text_embeddings = self.ws.get_document_embeddings(search_ids=sdoc_ids)

        # TODO 2: Topic modeliung ausführen
        # Initialize UMAP for dimensionality reduction
        umap_model = UMAP(n_neighbors=15, n_components=5, min_dist=0.0, metric="cosine")

        # TODO rename params -> bertopic names
        topic_model = BERTopic(
            language="multilingual",
            umap_model=umap_model,
            calculate_probabilities=True,
            nr_topics=nr_topics,
            min_topic_size=min_topic_size,
            top_n_words=top_n_words,
        )

        # Fit the model on the preprocessed text data and embeddings
        print("Fitting BERTopic model...")

        topics, probabilities = topic_model.fit_transform(
            preprocessed_text_data, text_embeddings
        )

        print("BERTopic model fitting completed.")
        # TODO 3: Ergebnisse abspeichern -> Datenbank
        # loop durch alle topics und create jeweils
        # TODO: change to extract all info through get_topic_info?
        if recompute:
            # delete data in db from this project
            subquery = (
                db.query(TopicInfoORM.id)
                .filter(TopicInfoORM.project_id == project_id)
                .scalar_subquery()
            )
            db.query(TopicInfoORM).where(TopicInfoORM.id.in_(subquery)).delete()

        topic_n = topic_model.get_topics()

        for index, topic in topic_n.items():
            if index != -1:
                topic_n_info = topic_model.get_topic_info(index)  # type: ignore

                # add new data -> list of document names and their respective probabilities
                topic_doc_probabilities = []
                for key, value in enumerate(topics):
                    if value == index:
                        # get the document name and the probability
                        sdoc_filenames[key]
                        if probabilities is not None:
                            topic_doc_probabilities.append(
                                [sdoc_filenames[key], probabilities[key][index]]
                            )

                crud_topic_info.create(
                    db=db,
                    create_dto=TopicInfoCreate(
                        project_id=project_id,
                        name=str(index),
                        doc_count=topic_n_info["Count"].values[0],
                        topic_words=[
                            TopicWordInfo(
                                word=topic_word[0],  # type: ignore
                                score=topic_word[1],  # type: ignore
                            )
                            for topic_word in topic
                        ],
                        topic_documents=[
                            TopicDocumentInfo(
                                doc_name=topic_doc_prob[0],
                                probability=topic_doc_prob[1],
                            )
                            for topic_doc_prob in topic_doc_probabilities
                        ],
                    ),
                )

    def preprocess_text(self, text: str, nlp: Language, custom_stopwords: List[str]):
        text = unescape(text)

        doc = nlp(text.lower())

        # Check if language detection exists before accessing
        if not doc._.has("language") or doc._.language is None:
            return ""

        # Only process if detected language is German or English
        if doc._.language["language"] in ["de", "en"]:
            tokens = [
                token.lemma_
                for token in doc
                if not token.is_stop  # Remove spaCy's stopwords
                and not token.is_punct  # Remove punctuation
                and not any(
                    char.isdigit() for char in token.text
                )  # Remove tokens with numbers
                and token.lemma_ not in custom_stopwords  # Remove custom stopwords
                and len(token) > 2  # Filter out very short tokens
            ]
            return " ".join(tokens)

        return ""  # Ensure function always returns a string

    def _make_topic_info(
        self,
        code_id: int,
        spans: List[Tuple[int, int]],
        adoc_id: int,
        sdoc: SourceDocumentDataORM,
        dtos: List[SpanAnnotationCreateIntern],
    ):
        for start, end in spans:
            dto = SpanAnnotationCreateIntern(
                begin_token=start,
                end_token=end,
                begin=sdoc.token_starts[start],
                end=sdoc.token_ends[end],
                span_text=sdoc.content[start:end],
                code_id=code_id,
                annotation_document_id=adoc_id,
            )
            dtos.append(dto)
