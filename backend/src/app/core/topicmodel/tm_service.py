import re
from typing import Dict, List, Optional, Set, Tuple

import joblib
import numpy as np
import torch
from app.core.data.crud.aspect import crud_aspect
from app.core.data.crud.document_aspect import crud_document_aspect
from app.core.data.crud.document_topic import crud_document_topic
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.topic import crud_topic
from app.core.data.dto.document_aspect import DocumentAspectCreate, DocumentAspectUpdate
from app.core.data.dto.document_topic import DocumentTopicCreate, DocumentTopicUpdate
from app.core.data.dto.topic import (
    TopicCreateIntern,
    TopicUpdateIntern,
)
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.orm.document_aspect import DocumentAspectORM
from app.core.data.orm.document_topic import DocumentTopicORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.topicmodel.ctfidf import ClassTfidfTransformer
from app.core.topicmodel.tm_job import (
    AddMissingDocsToAspectParams,
    AddTopicParams,
    CreateAspectParams,
    MergeTopicsParams,
    RefineTopicModelParams,
    RemoveTopicParams,
    ResetTopicModelParams,
    SplitTopicParams,
)
from app.core.topicmodel.tm_job_service import TMJobService
from app.core.vector.crud.aspect_embedding import crud_aspect_embedding
from app.core.vector.crud.topic_embedding import crud_topic_embedding
from app.core.vector.dto.aspect_embedding import AspectObjectIdentifier
from app.core.vector.dto.topic_embedding import TopicObjectIdentifier
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.promptembedder import PromptEmbedderInput
from hdbscan import HDBSCAN
from loguru import logger
from pydantic import BaseModel
from sklearn.feature_extraction.text import CountVectorizer
from sqlalchemy.orm import Session
from umap import UMAP


class TMService:
    def __init__(self, tm_job_service: TMJobService):
        self.tmjs: TMJobService = tm_job_service
        self.rms: RayModelService = RayModelService()
        self.ollama: OllamaService = OllamaService()
        self.sqls: SQLService = SQLService()
        self.repo: RepoService = RepoService()

    def _modify_documents(self, db: Session, aspect_id: int):
        aspect = crud_aspect.read(db=db, id=aspect_id)

        # 1. Find all text source documents that do not have an aspect yet
        sdoc_data = [
            (data.id, data.content)
            for data in crud_sdoc.read_text_data_with_no_aspect(
                db=db, aspect_id=aspect_id
            )
        ]
        logger.info(f"Found {len(sdoc_data)} source documents without an aspect. ")

        # 2. Modify the documents
        class OllamaResponse(BaseModel):
            content: str

        create_dtos: List[DocumentAspectCreate] = []
        if aspect.doc_modification_prompt:
            # if prompt is provided, use ollama to generate a modified document
            logger.info(f"Using Ollama to modify {len(sdoc_data)} source documents...")
            for sdoc_id, sdoc_content in sdoc_data:
                response = self.ollama.llm_chat(
                    system_prompt="You are a document modification assistant.",
                    user_prompt=aspect.doc_modification_prompt,
                    response_model=OllamaResponse,
                )
                create_dtos.append(
                    DocumentAspectCreate(
                        aspect_id=aspect_id,
                        sdoc_id=sdoc_id,
                        content=response.content,
                    )
                )
        else:
            # if no prompt is provided, use the original document
            logger.info(
                f"No prompt provided. Using the original document for {len(sdoc_data)} source documents."
            )
            create_dtos.extend(
                [
                    DocumentAspectCreate(
                        aspect_id=aspect_id,
                        sdoc_id=sdoc_id,
                        content=sdoc_content,
                    )
                    for sdoc_id, sdoc_content in sdoc_data
                ]
            )
        crud_document_aspect.create_multi(db=db, create_dtos=create_dtos)
        logger.info(f"Stored {len(create_dtos)} document aspects.")

    def __compute_embeddings_and_coordinates(
        self,
        project_id: int,
        aspect_id: int,
        embedding_model: str,
        embedding_prompt: str,
        doc_aspects: List[DocumentAspectORM],
    ) -> Tuple[List[List[float]], List[Tuple[float, float]]]:
        assert len(doc_aspects) > 0, "No document aspects provided."

        # 1. Embed the document aspects
        logger.info(
            f"Computing embeddings for {len(doc_aspects)} document aspects with model {embedding_model}..."
        )
        embedding_output = self.rms.promptembedder_embedding(
            input=PromptEmbedderInput(
                model_name=embedding_model,
                prompt=embedding_prompt,
                data=[da.content for da in doc_aspects],
            ),
        )
        assert len(embedding_output.embeddings) == len(
            doc_aspects
        ), "The number of embeddings does not match the number of documents."

        # 2. Compute the 2D coordinates
        umap_model_path = self.repo.get_model_dir(
            proj_id=project_id,
            model_prefix="umap_",
            model_name=f"aspect_{aspect_id}_{embedding_model}",
        )
        embeddings = np.array(embedding_output.embeddings)

        # No model exists, we need to fit a new UMAP model
        if not umap_model_path.exists():
            logger.info(
                f"Fitting a new UMAP model for {len(doc_aspects)} document aspects..."
            )

            # Fit a new UMAP model
            umap_model = UMAP(n_components=2, metric="cosine", low_memory=False)
            reducer = umap_model.fit(embeddings)

            # Store the fitted UMAP model
            joblib.dump(reducer, umap_model_path)
            logger.info(f"Stored new UMAP model at {umap_model_path}")

        # A model exists, we need load the existing UMAP model
        else:
            reducer = joblib.load(umap_model_path)
            logger.info(f"Loaded existing UMAP model from {umap_model_path}.")

        # Compute the OG 2D coordinates
        logger.info(
            f"Computing 2D coordinates for {len(doc_aspects)} document aspects..."
        )
        coords = reducer.transform(embeddings).tolist()

        return embedding_output.embeddings, coords

    def _embed_documents(
        self, db: Session, aspect_id: int, sdoc_ids: Optional[List[int]] = None
    ):
        """
        Embeds all DocumentAspects of the given Aspect:
        - all embeddings will be computed by the embedding_model defined in the given Aspect
        - all coordinates will be computed by a new UMAP model

        If sdoc_ids are provided, only those source documents will be embedded:
        - the coordinates will be computed by an already existing UMAP model

        :param db: The database session
        :param aspect_id: The ID of the Aspect
        :return: None
        """

        # 1. Read the document aspects
        aspect = crud_aspect.read(db=db, id=aspect_id)
        if sdoc_ids is None or len(sdoc_ids) == 0:
            # Read all document aspects
            doc_aspects = aspect.document_aspects
        else:
            # 2. Read the document aspects for the given source document IDs
            doc_aspects = crud_document_aspect.read_by_aspect_and_sdoc_ids(
                db=db, aspect_id=aspect_id, sdoc_ids=sdoc_ids
            )

        # 2. Compute embedding & coordinates, then store them in the DB
        if len(doc_aspects) > 0:
            logger.info(f"Embedding {len(doc_aspects)} document aspects...")
            embeddings, coords = self.__compute_embeddings_and_coordinates(
                project_id=aspect.project_id,
                aspect_id=aspect.id,
                embedding_model=aspect.embedding_model or "default",
                embedding_prompt=aspect.doc_embedding_prompt,
                doc_aspects=doc_aspects,
            )

            # Store embeddings in the vector DB
            uuids = crud_aspect_embedding.add_embedding_batch(
                project_id=aspect.project_id,
                ids=[
                    AspectObjectIdentifier(
                        aspect_id=aspect.id,
                        sdoc_id=da.sdoc_id,
                    )
                    for da in doc_aspects
                ],
                embeddings=embeddings,
            )

            # Store coordinates in the DB
            crud_document_aspect.update_multi(
                db=db,
                ids=[da.id for da in doc_aspects],
                update_dtos=[
                    DocumentAspectUpdate(
                        embedding_uuid=str(uuid),
                        x=float(coord[0]),
                        y=float(coord[1]),
                    )
                    for uuid, coord in zip(uuids, coords)
                ],
            )

            logger.info(
                f"Stored embeddings and coordinates for {len(doc_aspects)} document aspects."
            )

    def _cluster_documents(
        self,
        db: Session,
        aspect_id: int,
        sdoc_ids: Optional[List[int]],
        num_clusters: Optional[int],
    ):
        aspect = crud_aspect.read(db=db, id=aspect_id)

        # 1. Read the document aspects
        if sdoc_ids is None or len(sdoc_ids) == 0:
            doc_aspects = aspect.document_aspects
        else:
            doc_aspects = crud_document_aspect.read_by_aspect_and_sdoc_ids(
                db=db, aspect_id=aspect_id, sdoc_ids=sdoc_ids
            )

        # ... and their embeddings
        # Assert that all document aspects have embeddings
        assert all(
            da.embedding_uuid is not None for da in doc_aspects
        ), "Not all document aspects have embeddings."
        embedding_uuids = [da.embedding_uuid for da in doc_aspects]
        embeddings = np.array(
            crud_aspect_embedding.get_embeddings_by_uuids(
                project_id=aspect.project_id, uuids=embedding_uuids
            )
        )
        logger.info(
            f"Found {len(doc_aspects)} document aspects with embeddings for clustering."
        )

        # 2. Reduce the dimensionality of the embeddings
        logger.info(
            f"Reducing the dimensionality of the embeddings from {embeddings.shape} to 10 dimensions..."
        )
        reducer = UMAP(
            n_neighbors=15, n_components=10, metric="cosine", low_memory=False
        )
        reduced_embeddings = np.array(reducer.fit_transform(embeddings))
        logger.info(
            f"Reduced the dimensionality of the embeddings from {embeddings.shape} to {reduced_embeddings.shape}."
        )

        # 3. Cluster the reduced embeddings
        logger.info("Clustering the reduced embeddings with HDBSCAN...")
        hdbscan_model = HDBSCAN(min_cluster_size=10, metric="euclidean")
        clusters = hdbscan_model.fit_predict(reduced_embeddings)
        cluster_ids = np.unique(clusters).tolist()
        logger.info(f"Found {len(cluster_ids)} clusters with HDBSCAN")

        # 5. Store the topics (clusters) in the DB
        topics = crud_topic.create_multi(
            db=db,
            create_dtos=[
                TopicCreateIntern(aspect_id=aspect_id, level=0)
                for cluster in cluster_ids
                if cluster != -1  # no outliers
            ],
        )
        cluster_id2topic_id = {
            cluster_id: topic.id for cluster_id, topic in zip(cluster_ids, topics)
        }
        logger.info(
            f"Stored {len(cluster_id2topic_id)} topics in the database corresponding to {len(cluster_ids)} clusters."
        )

        # 6. Store the cluster assignments in the database
        crud_document_topic.create_multi(
            db=db,
            create_dtos=[
                DocumentTopicCreate(
                    sdoc_id=da.sdoc_id,
                    topic_id=cluster_id2topic_id[cluster],
                )
                for da, cluster in zip(doc_aspects, clusters)
                if cluster != -1  # no outliers
            ],
        )
        logger.info(
            f"Assigned {len(doc_aspects)} document aspects to {len(cluster_id2topic_id)} topics."
        )

    def __preprocess_text(self, documents: List[str]) -> List[str]:
        r"""Basic preprocessing of text.

        Steps:
            * Replace \n and \t with whitespace
            * Only keep alpha-numerical characters
        """
        cleaned_documents = [doc.replace("\n", " ") for doc in documents]
        cleaned_documents = [doc.replace("\t", " ") for doc in cleaned_documents]

        # works for german and english
        cleaned_documents = [
            re.sub(r"[^A-Za-z0-9ÄäÖöÜüß ]+", "", doc) for doc in cleaned_documents
        ]
        cleaned_documents = [
            doc if doc != "" else "emptydoc" for doc in cleaned_documents
        ]
        return cleaned_documents

    def __c_tf_idf(
        self,
        documents_per_topic: List[str],
    ) -> Tuple[np.ndarray, List[str]]:
        """Calculate a class-based TF-IDF where m is the number of total documents.

        Arguments:
            documents_per_topic: The joined documents per topic such that each topic has a single
                                 string made out of multiple documents
            m: The total number of documents (unjoined)
            fit: Whether to fit a new vectorizer or use the fitted self.vectorizer_model
            partial_fit: Whether to run `partial_fit` for online learning

        Returns:
            tf_idf: The resulting matrix giving a value (importance score) for each word per topic
            words: The names of the words to which values were given
        """
        documents = self.__preprocess_text(documents_per_topic)

        # Compute bag-of-words representation
        vectorizer_model = CountVectorizer(ngram_range=(1, 1), lowercase=True)
        X = vectorizer_model.fit_transform(documents)
        words = vectorizer_model.get_feature_names_out().tolist()

        # Compute the class-based TF-IDF
        ctfidf_model = ClassTfidfTransformer(
            bm25_weighting=True, reduce_frequent_words=True
        )
        c_tf_idf = ctfidf_model.fit_transform(X)

        return c_tf_idf, words

    def _extract_topics(
        self, db: Session, aspect_id: int, topic_ids: Optional[List[int]]
    ):
        """
        Extracts all topis of the given Aspect by:
        1. Finding the most important words for each topic ( group documents by topic, create one "big" document per topic, compute c-TF-IDF, identify top words )
        2. Generating topic name and description with LLM
        3. Computing the topic embeddings (cluster centroids)
        4. Identifying the top similar documents
        5. Storing the topics in the database and vector DB
        :param db: The database session
        :param aspect_id: The ID of the Aspect
        :param topic_ids: Optional list of topic IDs to consider. If None, all topics for the aspect will be considered.
        :return: None
        """

        aspect = crud_aspect.read(db=db, id=aspect_id)
        level = 0  # TODO: we only consider 1 level for now (level 0)

        # 1. Read the topics
        if topic_ids is None or len(topic_ids) == 0:
            topics = crud_topic.read_by_aspect_and_level(
                db=db, aspect_id=aspect_id, level=level
            )
        else:
            # TODO: Ich glaube das ist falsch! Für C-TF-IDF müssen immer alle topics berücksichtigt werden!
            # TODO: aber es sollten wahrscheinlich trotzdem nur die topics geupdated werden, die in topic_ids sind!
            topics = crud_topic.read_by_ids(db=db, ids=topic_ids)
        topic_ids = [topic.id for topic in topics]
        logger.info(f"Extracting data for {len(topic_ids)} topics.")

        # 2. Read the document aspects
        doc_aspects, assigned_topics = (
            crud_document_aspect.read_by_aspect_and_topic_ids(
                db=db, aspect_id=aspect_id, topic_ids=topic_ids
            )
        )
        # Ensure that assigned topics are in topics
        assert all(
            at in topic_ids for at in assigned_topics
        ), "Assigned topics are not in the list of topics."
        logger.info(
            f"Found {len(doc_aspects)} document aspects assigned to {len(topic_ids)} topics."
        )

        # 3. Group the documents by topic, creating a "big" document per topic, which is required by c-TF-IDF
        topic_to_doc_aspects: Dict[int, List[DocumentAspectORM]] = {}
        for da, topic_id in zip(doc_aspects, assigned_topics):
            if topic_id not in topic_to_doc_aspects:
                topic_to_doc_aspects[topic_id] = []
            topic_to_doc_aspects[topic_id].append(da)
        documents_per_topic: List[str] = [
            " ".join([da.content for da in das])
            for das in topic_to_doc_aspects.values()
        ]
        tids = list(topic_to_doc_aspects.keys())

        # 4. Compute the c-TF-IDF
        logger.info(
            f"Computing c-TF-IDF for {len(documents_per_topic)} documents (1 doc per topic)..."
        )
        c_tf_idf, words = self.__c_tf_idf(documents_per_topic=documents_per_topic)

        # 5. Find the most important words for each topic
        scores, indices = torch.topk(torch.tensor(c_tf_idf), k=10)
        scores = scores.tolist()
        indices = indices.tolist()
        assert (
            len(tids) == len(scores) == len(indices)
        ), f"Length mismatch: {len(tids)}, {len(scores)}, {len(indices)}"
        top_words: List[List[str]] = []
        top_word_scores: List[List[float]] = []
        for scores, indices, topic_id in zip(scores, indices, tids):
            top_words.append([words[i] for i in indices])
            top_word_scores.append([float(s) for s in scores])
        logger.info("Extracted top words and scores for each topic!")

        # 6. Generate topic name and description with LLM
        class OllamaResponse(BaseModel):
            description: str
            title: str

        topic_names = []
        topic_descriptions = []
        logger.info("Generating topic names and descriptions with LLM...")
        for tw in top_words:
            logger.info(f"Generating name and description for topic {tw[:5]}...")
            response = self.ollama.llm_chat(
                system_prompt="You are a topic name and description generator.",
                user_prompt=f"Generate a name and description for the topic with the following words: {', '.join(tw)}",
                response_model=OllamaResponse,
            )
            topic_names.append(response.title)
            topic_descriptions.append(response.description)

        # 7. Based on embeddings...
        # Assert that all document aspects have embeddings
        assert all(
            da.embedding_uuid is not None for da in doc_aspects
        ), "Not all document aspects have embeddings."
        embedding_uuids = [da.embedding_uuid for da in doc_aspects]
        embedding_sdoc_ids = np.array([da.sdoc_id for da in doc_aspects])
        embeddings = np.array(
            crud_aspect_embedding.get_embeddings_by_uuids(
                project_id=aspect.project_id, uuids=embedding_uuids
            )
        )

        topic_centroids: Dict[int, np.ndarray] = {}
        top_docs: List[List[int]] = []
        assigned_topics_arr = np.array(assigned_topics)
        distance_update_ids: List[
            Tuple[int, int]
        ] = []  # List of (sdoc_id, topic_id) tuples
        distance_update_dtos: List[DocumentTopicUpdate] = []
        for topic_id in np.unique(assigned_topics_arr):
            doc_embeddings = embeddings[assigned_topics_arr == topic_id]
            sdoc_ids = embedding_sdoc_ids[assigned_topics_arr == topic_id]

            # ... compute the topic embeddings (cluster centroids)
            topic_centroids[topic_id] = np.mean(doc_embeddings, axis=0)

            # .. compute the top 3 documents
            similarities = doc_embeddings @ topic_centroids[topic_id]
            num_top_docs_to_retrieve = min(3, len(doc_embeddings))
            # TODO: Is this correct? How do I want to sort? i think it is ascending now! vllt einfach torchtopk nutzen?
            top_doc_indices = np.argsort(similarities)[:num_top_docs_to_retrieve]
            top_doc_ids = [
                topic_to_doc_aspects[topic_id][i].sdoc_id for i in top_doc_indices
            ]
            top_docs.append(top_doc_ids)

            # ... update the distances of the document topics
            for sdoc_id, similarity in zip(sdoc_ids, similarities):
                distance_update_dtos.append(
                    DocumentTopicUpdate(distance=1.0 - similarity)
                )

        logger.info(
            f"Computed topic embeddings & top documents for {len(topic_centroids)} topics."
        )

        # 8. Store the topics in the databases ...
        # ... store the topic embeddings in vector DB
        crud_topic_embedding.add_embedding_batch(
            project_id=aspect.project_id,
            ids=[
                TopicObjectIdentifier(
                    aspect_id=aspect.id,
                    topic_id=topic_id,
                )
                for topic_id in tids
            ],
            embeddings=[topic_centroids[topic_id].tolist() for topic_id in tids],
        )

        # ... store the topics in the database
        update_dtos: List[TopicUpdateIntern] = []
        for name, description, scores, words, docs in zip(
            topic_names,
            topic_descriptions,
            top_word_scores,
            top_words,
            top_docs,
        ):
            update_dtos.append(
                TopicUpdateIntern(
                    name=name,
                    description=description,
                    top_words=words,
                    top_word_scores=scores,
                    top_docs=docs,
                )
            )
        crud_topic.update_multi(db=db, ids=tids, update_dtos=update_dtos)

        # ... update the document topics with the new distances
        if len(distance_update_dtos) > 0:
            # Update the distances of the document topics
            crud_document_topic.update_multi_by_sdoc_topic_ids(
                db=db,
                sdoc_topic_ids=distance_update_ids,
                update_dtos=distance_update_dtos,
            )

        logger.info(
            f"Updated {len(update_dtos)} topics in the database with names, descriptions, top words, top word scores, and top documents."
        )

    def create_aspect(self, tm_job_id: str, params: CreateAspectParams):
        aspect_id = params.aspect_id
        with self.sqls.db_session() as db:
            # 1. Modify the documents based on the prompt
            self._modify_documents(db=db, aspect_id=aspect_id)

            # 2. Embedd the documents based on the prompt
            self._embed_documents(db=db, aspect_id=aspect_id)

            # 3. Cluster the documents
            self._cluster_documents(
                db=db,
                aspect_id=aspect_id,
                sdoc_ids=None,
                num_clusters=None,
            )

            # 4. Extract the topics
            self._extract_topics(
                db=db,
                aspect_id=aspect_id,
                topic_ids=None,
            )

    def add_missing_docs_to_aspect(
        self,
        tm_job_id: str,
        params: AddMissingDocsToAspectParams,
    ):
        pass

    def add_topic(self, tm_job_id: str, params: AddTopicParams):
        with self.sqls.db_session() as db:
            # Read the aspect
            aspect = crud_aspect.read(db=db, id=params.create_dto.aspect_id)

            # Read the current document <-> topic assignments
            document_topics = crud_document_topic.read_by_aspect(
                db=db, aspect_id=aspect.id
            )
            doc2topic: Dict[int, DocumentTopicORM] = {
                dt.sdoc_id: dt for dt in document_topics
            }
            assert (
                len(document_topics) == len(doc2topic)
            ), f"There are duplicate document-topic assignments in the database for aspect {aspect.id}!"

        # 2. Embedd the new topic
        logger.info(
            f"Computing embeddings for the new topic with model {aspect.embedding_model}..."
        )
        embedding_output = self.rms.promptembedder_embedding(
            input=PromptEmbedderInput(
                model_name=aspect.embedding_model,
                prompt=aspect.doc_embedding_prompt,
                data=[f"{params.create_dto.name}\n{params.create_dto.description}"],
            ),
        )
        assert (
            len(embedding_output.embeddings) == 1
        ), "Expected exactly one embedding output for the new topic."

        # 3. Create the new topic in the database
        new_topic = crud_topic.create(
            db=db,
            create_dto=TopicCreateIntern(
                parent_topic_id=params.create_dto.parent_topic_id,
                aspect_id=params.create_dto.aspect_id,
                level=params.create_dto.level,
                name=params.create_dto.name,
                description=params.create_dto.description,
                color=params.create_dto.color,
            ),
        )

        # 4. For all source documents in the aspect, decide whether to assign the new topic or not. Track the changes/affected topics!
        update_dtos: List[DocumentTopicUpdate] = []
        update_ids: List[int] = []
        modified_topics: Set[int] = set()
        results = crud_aspect_embedding.search_near_vector_in_aspect(
            project_id=aspect.project_id,
            aspect_id=aspect.id,
            vector=embedding_output.embeddings[0],
            k=len(document_topics),
        )
        for result in results:
            doc_topic = doc2topic.get(result.id.sdoc_id, None)
            assert (
                doc_topic is not None
            ), f"Document {result.id.sdoc_id} does not have a topic assignment in aspect {aspect.id}."

            # assign the new topic if the distance is smaller than the current topic's distance
            if result.score < doc_topic.distance:
                update_ids.append(doc_topic.id)
                update_dtos.append(
                    DocumentTopicUpdate(
                        topic_id=new_topic.id,
                        distance=result.score,
                    )
                )
                # track changes
                modified_topics.add(doc_topic.topic_id)
                modified_topics.add(new_topic.id)

        # 5. Store the new topic assignments in the database
        if len(update_dtos) > 0:
            crud_document_topic.update_multi(
                db=db, ids=update_ids, update_dtos=update_dtos
            )
            logger.info(
                f"Updated {len(update_dtos)} document-topic assignments with the new topic {new_topic.id}."
            )

        # 6. Extract the topics for all affected ones (computing top words, top docs, embedding, etc)
        if len(modified_topics) > 0:
            logger.info(
                f"Extracting topics for {len(modified_topics)} modified topics: {modified_topics}."
            )
            self._extract_topics(
                db=db,
                aspect_id=aspect.id,
                topic_ids=list(modified_topics),
            )

        pass

    def remove_topic(self, tm_job_id: str, params: RemoveTopicParams):
        pass

    def merge_topics(self, tm_job_id: str, params: MergeTopicsParams):
        pass

    def split_topic(self, tm_job_id: str, params: SplitTopicParams):
        pass

    def refine_topic_model(self, tm_job_id: str, params: RefineTopicModelParams):
        pass

    def reset_topic_model(self, tm_job_id: str, params: ResetTopicModelParams):
        pass
