from app.core.db.sql_service import SQLService
from app.core.db.weaviate_service import WeaviateService
from app.util.singleton_meta import SingletonMeta


class TopicService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.ws: WeaviateService = WeaviateService()
        return super(TopicService, cls).__new__(cls)

    def perform_topic_modeling(self, project_id: int):
        print("test")
        # TODO 1: Alle daten finden die fürs topic modeling wichtig sind finden
        # Get textdata
        # with self.sqls.db_session() as db:
        #    project = crud_project.read(db=db, id=project_id)
        #    for sdoc in project.source_documents:
        # sdoc.filename
        # sdoc.id
        # read all files
        # doc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)
        # doc_datas[1].content
        # get text embeddings
        # text_embeddings = weaviateservice getdocembeddings(ids=sdoc_ids)
        # TODO 2: Topic modeliung ausführen
        # Initialize UMAP for dimensionality reduction
        # umap_model = UMAP(n_neighbors=15, n_components=5, min_dist=0.0, metric='cosine')

        # Initialize BERTopic

    # topic_model = BERTopic(language='multilingual',
    #                       umap_model=umap_model,
    #                       calculate_probabilities=True,
    #                       nr_topics= num_topics,
    #                       min_topic_size=min_files ,
    #                        top_n_words=num_top_words)
    # TODO rename params -> bertopic names
    # Fit the model on the preprocessed text data and embeddings
    # print("Fitting BERTopic model...")
    # preprocessed_text_data -> doc_datas[1].content
    # topics, probabilities = topic_model.fit_transform(preprocessed_text_data, text_embeddings)
    # print("BERTopic model fitting completed.")
    # TODO 3: Ergebnisse abspeichern -> Datenbank
    # topic_info = topic_model.get_topic_info()
    # für ein topic
    # crud_topic_info.create(db=db, create_dto=TopicInfoCreate(
    #    project_id=project_id,
    #    name=" ",
    #    score=probabilities[0],
    #    topic_words=[TopicWordInfo(word="a", score=1.0)]
    # ))

    # def _make_topic_info(
    #    self,
    #    code_id: int,
    #    spans: List[Tuple[int, int]],
    #    adoc_id: int,
    #    sdoc: SourceDocumentDataORM,
    #    dtos: List[SpanAnnotationCreateIntern],
    # ):
    #    for start, end in spans:
    #        dto = SpanAnnotationCreateIntern(
    #            begin_token=start,
    #            end_token=end,
    #            begin=sdoc.token_starts[start],
    #            end=sdoc.token_ends[end],
    #            span_text=sdoc.content[start:end],
    #            code_id=code_id,
    #            annotation_document_id=adoc_id,
    #        )
    #        dtos.append(dto)
