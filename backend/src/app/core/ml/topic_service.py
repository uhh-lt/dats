from typing import List, Tuple

from bertopic import BERTopic
from umap import UMAP

from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.topic_info import crud_topic_info
from app.core.data.dto.span_annotation import SpanAnnotationCreateIntern
from app.core.data.dto.topic_info import TopicInfoCreate, TopicWordInfo
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.topic_info import TopicInfoORM
from app.core.db.sql_service import SQLService
from app.core.db.weaviate_service import WeaviateService
from app.util.singleton_meta import SingletonMeta


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
        # TODO NOAH check auf empty files
        # Get textdata
        text_data = []
        with self.sqls.db_session() as db:
            project = crud_project.read(db=db, id=project_id)
            sdoc_filenames = [
                x.filename for x in project.source_documents if x.data.content.strip()
            ]
            sdoc_ids = [
                x.id for x in project.source_documents if x.data.content.strip()
            ]
            print(sdoc_filenames)

            # read all files
            doc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)
            for doc_data in doc_datas:
                # check for None
                if doc_data:
                    # check for empty content
                    if doc_data.content.strip():
                        text_data.append(doc_data.content)

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

        topics, probabilities = topic_model.fit_transform(text_data, text_embeddings)

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

                crud_topic_info.create(
                    db=db,
                    create_dto=TopicInfoCreate(
                        project_id=project_id,
                        name=str(index),
                        doc_count=topic_n_info["Count"].values[0],
                        topic_words=[
                            TopicWordInfo(word=topic_word[0], score=topic_word[1])  # type: ignore
                            for topic_word in topic
                        ],
                    ),
                )

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
