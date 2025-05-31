import re
from collections import Counter, defaultdict
from datetime import datetime
from typing import Callable, Dict, List, Optional, Set, Tuple

import joblib
import numpy as np
import torch
from app.core.data.crud.aspect import crud_aspect
from app.core.data.crud.document_aspect import crud_document_aspect
from app.core.data.crud.document_topic import crud_document_topic
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.topic import crud_topic
from app.core.data.dto.aspect import AspectUpdateIntern
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
    ChangeTopicParams,
    CreateAspectParams,
    CreateTopicWithNameParams,
    CreateTopicWithSdocsParams,
    MergeTopicsParams,
    RefineTopicModelParams,
    RemoveTopicParams,
    ResetTopicModelParams,
    SplitTopicParams,
    TMJobRead,
)
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

TMJUpdateFN = Callable[[Optional[int], Optional[str]], TMJobRead]


class TMService:
    def __init__(self, update_status_clbk: TMJUpdateFN):
        self.update_status_clbk: TMJUpdateFN = update_status_clbk
        self.rms: RayModelService = RayModelService()
        self.ollama: OllamaService = OllamaService()
        self.sqls: SQLService = SQLService()
        self.repo: RepoService = RepoService()

    def _log_status_msg(self, status_msg: str):
        self.update_status_clbk(None, status_msg)
        logger.info(status_msg)

    def _log_status_step(self, step: int):
        self.update_status_clbk(step, None)

    def _modify_documents(self, db: Session, aspect_id: int):
        aspect = crud_aspect.read(db=db, id=aspect_id)

        # 1. Find all text source documents that do not have an aspect yet
        sdoc_data = [
            (data.id, data.content)
            for data in crud_sdoc.read_text_data_with_no_aspect(
                db=db, aspect_id=aspect_id, project_id=aspect.project_id
            )
        ]
        self._log_status_msg(
            f"Found {len(sdoc_data)} source documents without an aspect. Modifying them..."
        )

        # 2. Modify the documents
        class OllamaResponse(BaseModel):
            content: str

        create_dtos: List[DocumentAspectCreate] = []
        if aspect.doc_modification_prompt:
            # if prompt is provided, use ollama to generate a modified document
            for idx, (sdoc_id, sdoc_content) in enumerate(sdoc_data):
                self._log_status_msg(
                    f"Modifying documents with LLM ({idx + 1} / {len(sdoc_data)})..."
                )

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
            self._log_status_msg(
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
        self._log_status_msg(
            f"Modified {len(create_dtos)} source documents and created DocumentAspects."
        )

    def __compute_embeddings_and_coordinates(
        self,
        project_id: int,
        aspect_id: int,
        embedding_model: str,
        embedding_prompt: str,
        doc_aspects: List[DocumentAspectORM],
        train_docs: Optional[List[str]] = None,
        train_labels: Optional[List[str]] = None,
    ) -> Tuple[List[List[float]], List[Tuple[float, float]]]:
        assert len(doc_aspects) > 0, "No document aspects provided."

        # 1. Embed the document aspects
        self._log_status_msg(
            f"Computing embeddings for {len(doc_aspects)} document aspects with model {embedding_model}..."
        )
        embedding_output = self.rms.promptembedder_embedding(
            input=PromptEmbedderInput(
                model_name=embedding_model,
                prompt=embedding_prompt,
                data=[da.content for da in doc_aspects],
                train_docs=train_docs,
                train_labels=train_labels,
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
            self._log_status_msg(
                f"Fitting a new UMAP model for {len(doc_aspects)} document aspects..."
            )

            # Fit a new UMAP model
            umap_model = UMAP(n_components=2, metric="cosine", low_memory=False)
            reducer = umap_model.fit(embeddings)

            # Store the fitted UMAP model
            joblib.dump(reducer, umap_model_path)
            self._log_status_msg(
                f"Fitted and stored new UMAP model at {umap_model_path}."
            )

        # A model exists, we need load the existing UMAP model
        else:
            reducer = joblib.load(umap_model_path)
            self._log_status_msg(f"Loaded existing UMAP model from {umap_model_path}.")

        # Compute the 2D coordinates
        self._log_status_msg(
            f"Computing 2D coordinates for {len(doc_aspects)} document aspects using the UMAP model..."
        )
        coords = reducer.transform(embeddings).tolist()
        self._log_status_msg(
            f"Computed 2D coordinates for {len(doc_aspects)} document aspects."
        )

        return embedding_output.embeddings, coords

    # def __build_training_data(
    #     self,
    #     db: Session,
    #     aspect_id: int,
    # ) -> Tuple[List[str], List[str], List[int]]:
    #     # Read all topics
    #     all_topics = crud_topic.read_by_aspect_and_level(
    #         db=db, aspect_id=aspect_id, level=0
    #     )

    #     # Read the current document <-> topic assignments
    #     document_topics = crud_document_topic.read_by_aspect(db=db, aspect_id=aspect_id)

    #     # Build training_data, consisting of all accepted documents
    #     train_labels: List[str] = []
    #     train_doc_ids: List[int] = []
    #     topic2accepted_docs: Dict[int, List[int]] = {t.id: [] for t in all_topics}
    #     for dt in document_topics:
    #         if dt.is_accepted:
    #             topic2accepted_docs[dt.topic_id].append(dt.sdoc_id)
    #             train_labels.append(f"{dt.topic_id}")
    #             train_doc_ids.append(dt.sdoc_id)

    #     # Ensure that every topic has at least one accepted document by using a topic's top documents
    #     empty_topics = [
    #         topic for topic in all_topics if len(topic2accepted_docs[topic.id]) == 0
    #     ]
    #     for topic in empty_topics:
    #         assert topic.top_docs is not None, (
    #             f"Topic {topic.id} has no accepted documents, but top_docs is not None."
    #         )
    #         for top_doc in topic.top_docs:
    #             topic2accepted_docs[topic.id].append(top_doc)
    #             train_labels.append(f"{topic.id}")
    #             train_doc_ids.append(top_doc)

    #     # Read the corresponding aspect texts
    #     doc_aspects = crud_document_aspect.read_by_aspect_and_sdoc_ids(
    #         db=db,
    #         sdoc_ids=train_doc_ids,
    #         aspect_id=aspect_id,
    #     )
    #     sdoc_id2doc_aspect: Dict[int, DocumentAspectORM] = {
    #         da.sdoc_id: da for da in doc_aspects
    #     }
    #     train_docs = [sdoc_id2doc_aspect[doc_id].content for doc_id in train_doc_ids]

    #     return train_docs, train_labels, train_doc_ids

    def __build_training_data(
        self,
        db: Session,
        aspect_id: int,
    ) -> Tuple[List[str], List[str], List[int]]:
        # Read the aspect
        aspect = crud_aspect.read(db=db, id=aspect_id)

        # Read all topics
        all_topics = crud_topic.read_by_aspect_and_level(
            db=db, aspect_id=aspect.id, level=0
        )
        topic2accepted_docs: Dict[int, List[int]] = {t.id: [] for t in all_topics}

        # Read the document aspects
        doc_aspects = aspect.document_aspects
        sdoc_id2doc_aspect: Dict[int, DocumentAspectORM] = {
            da.sdoc_id: da for da in doc_aspects
        }

        # Read the current document <-> topic assignments
        document_topics = crud_document_topic.read_by_aspect(db=db, aspect_id=aspect.id)
        for dt in document_topics:
            if dt.is_accepted:
                topic2accepted_docs[dt.topic_id].append(dt.sdoc_id)

        # Build training_data
        train_labels: List[str] = []
        train_docs: List[str] = []
        train_doc_ids: List[int] = []
        for topic in all_topics:
            if topic.is_outlier:
                continue

            accepted_sdoc_ids = topic2accepted_docs[topic.id]
            if len(accepted_sdoc_ids) == 0:
                # If there are no accepted documents, use the top documents
                assert (
                    topic.top_docs is not None
                ), f"Topic {topic.id} has no accepted documents, but top_docs is not None."
                accepted_sdoc_ids = topic.top_docs

            for sdoc_id in accepted_sdoc_ids:
                da = sdoc_id2doc_aspect[sdoc_id]
                train_docs.append(da.content)
                train_labels.append(f"{topic.id}")
                train_doc_ids.append(da.sdoc_id)

        return train_docs, train_labels, train_doc_ids

    def _embed_documents(
        self,
        db: Session,
        aspect_id: int,
        sdoc_ids: Optional[List[int]] = None,
        train_docs: Optional[List[str]] = None,
        train_labels: Optional[List[str]] = None,
    ):
        """
        Embeds all DocumentAspects of the given Aspect:
        - all embeddings will be computed by the embedding_model defined in the given Aspect
        - all coordinates will be computed by a new UMAP model

        If sdoc_ids are provided, only those source documents will be embedded:
        - the coordinates will be computed by an already existing UMAP model

        :param db: The database session
        :param aspect_id: The ID of the Aspect
        :param improve_embeddings: If True, the embeddings will be improved by training the embedding model
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
            self._log_status_msg(
                f"Embedding {len(doc_aspects)} document aspects for aspect {aspect_id}..."
            )
            embeddings, coords = self.__compute_embeddings_and_coordinates(
                project_id=aspect.project_id,
                aspect_id=aspect.id,
                embedding_model=aspect.embedding_model,
                embedding_prompt=aspect.doc_embedding_prompt,
                doc_aspects=doc_aspects,
                train_docs=train_docs,
                train_labels=train_labels,
            )

            # Store embeddings in the vector DB
            crud_aspect_embedding.add_embedding_batch(
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
                ids=[(da.sdoc_id, da.aspect_id) for da in doc_aspects],
                update_dtos=[
                    DocumentAspectUpdate(
                        x=float(coord[0]),
                        y=float(coord[1]),
                    )
                    for coord in coords
                ],
            )

            self._log_status_msg(
                f"Stored embeddings and coordinates for {len(doc_aspects)} document aspects."
            )

    def __find_new_to_old_topic_mapping(
        self,
        labeled_documents: List[Tuple[int, int]],
    ) -> Dict[int, int]:
        """
        Maps new topic IDs to the most frequent old topic ID.

        Input is a list of (old_topic_id, new_topic_id) integer pairs.

        Args:
            labeled_documents: List of (old_topic_id, new_topic_id) tuples.

        Returns:
            Dictionary mapping new_topic_id (int) to its most frequent
            associated old_topic_id (int).
        """
        new_topic_to_old_topic_candidates: Dict[int, List[int]] = defaultdict(list)

        # Group old_ids by new_id
        for old_id, new_id in labeled_documents:
            new_topic_to_old_topic_candidates[new_id].append(old_id)

        final_mapping: Dict[int, int] = {}
        # For each new_id, find the most common old_id
        for new_id, old_id_list in new_topic_to_old_topic_candidates.items():
            count: Counter[int] = Counter(old_id_list)
            most_common_old_id: int = count.most_common(1)[0][0]
            final_mapping[new_id] = most_common_old_id

        return final_mapping

    def _cluster_documents(
        self,
        db: Session,
        aspect_id: int,
        sdoc_ids: Optional[List[int]],
        num_clusters: Optional[int],
        train_doc_ids: List[int] = [],
        train_topic_ids: List[int] = [],
    ) -> List[int]:
        """
        Clusters the document aspects of the given Aspect using HDBSCAN.
        If sdoc_ids are provided, only those source documents will be clustered.
        :param db: The database session
        :param aspect_id: The ID of the Aspect
        :return: List of topic IDs that were assigned to the documents.
        """

        aspect = crud_aspect.read(db=db, id=aspect_id)

        # 1. Read the document aspects
        if sdoc_ids is None or len(sdoc_ids) == 0:
            doc_aspects = aspect.document_aspects
        else:
            doc_aspects = crud_document_aspect.read_by_aspect_and_sdoc_ids(
                db=db, aspect_id=aspect_id, sdoc_ids=sdoc_ids
            )

        # ... and their embeddings
        embeddings = np.array(
            crud_aspect_embedding.get_embeddings(
                project_id=aspect.project_id,
                ids=[
                    AspectObjectIdentifier(aspect_id=da.aspect_id, sdoc_id=da.sdoc_id)
                    for da in doc_aspects
                ],
            )
        )
        self._log_status_msg(
            f"Found {len(doc_aspects)} document aspects with embeddings for clustering."
        )

        # 2. Reduce the dimensionality of the embeddings
        self._log_status_msg(
            f"Reducing the dimensionality of the embeddings from {embeddings.shape} to 10 dimensions..."
        )
        reducer = UMAP(
            n_neighbors=15, n_components=10, metric="cosine", low_memory=False
        )
        reduced_embeddings = np.array(reducer.fit_transform(embeddings))
        self._log_status_msg(
            f"Reduced the dimensionality of the embeddings from {embeddings.shape} to {reduced_embeddings.shape}."
        )

        # 3. Cluster the reduced embeddings
        self._log_status_msg("Clustering the reduced embeddings with HDBSCAN...")
        hdbscan_model = HDBSCAN(min_cluster_size=10, metric="euclidean")
        clusters = hdbscan_model.fit_predict(reduced_embeddings).tolist()
        cluster_ids = set(clusters)
        self._log_status_msg(f"Found {len(cluster_ids)} clusters with HDBSCAN")

        # 4. Storing / reusing the topics
        if len(train_doc_ids) > 0 and len(train_topic_ids) > 0:
            # Either: Reuse existing topics, automatically inferring a mapping from existing topics to clusters
            train_doc2top: Dict[int, int] = {
                doc_id: topic_id
                for doc_id, topic_id in zip(train_doc_ids, train_topic_ids)
            }
            new_doc2top: Dict[int, int] = {
                da.sdoc_id: cluster for da, cluster in zip(doc_aspects, clusters)
            }
            labeled_docs = [
                (train_doc2top[doc_id], new_doc2top[doc_id]) for doc_id in train_doc_ids
            ]
            cluster_id2topic_id = self.__find_new_to_old_topic_mapping(labeled_docs)

            # add mapping for outlier topic
            outlier_topic = crud_topic.read_or_create_outlier_topic(
                db=db, aspect_id=aspect_id, level=0
            )
            cluster_id2topic_id[-1] = outlier_topic.id  # -1 is the outlier cluster ID
            self._log_status_msg(
                f"Computed a mapping from {len(cluster_id2topic_id)} clusters to existing topics."
            )

            # Construct update DTOS
            doc_topics = crud_document_topic.read_by_aspect(db=db, aspect_id=aspect_id)
            sdoc_id2doctopic = {dt.sdoc_id: dt for dt in doc_topics}
            update_dtos: List[DocumentTopicUpdate] = []
            update_ids: list[tuple[int, int]] = []
            for da, cluster in zip(doc_aspects, clusters):
                if da.sdoc_id in train_doc_ids:
                    continue  # Skip documents that were used for training!

                dt = sdoc_id2doctopic[da.sdoc_id]
                if dt.is_accepted:
                    continue  # Skip already accepted assignments!

                new_topic_id = cluster_id2topic_id[cluster]
                if dt.topic_id == new_topic_id:
                    continue

                # Update the document topic with the new topic ID
                update_ids.append(
                    (
                        dt.sdoc_id,
                        dt.topic_id,
                    )
                )
                update_dtos.append(
                    DocumentTopicUpdate(
                        topic_id=new_topic_id,
                    )
                )

            # Update!
            crud_document_topic.update_multi(
                db=db,
                ids=update_ids,
                update_dtos=update_dtos,
            )
            self._log_status_msg(
                f"Updated {len(update_ids)}/{len(doc_topics)} document topic assignments."
            )

        else:
            # Or: Store the topics (clusters) in the DB
            topics = crud_topic.create_multi(
                db=db,
                create_dtos=[
                    TopicCreateIntern(
                        aspect_id=aspect_id,
                        level=0,
                        name="Outlier" if cluster == -1 else None,
                        is_outlier=(cluster == -1),
                    )
                    for cluster in cluster_ids
                ],
            )
            cluster_id2topic_id = {
                cluster_id: topic.id for cluster_id, topic in zip(cluster_ids, topics)
            }
            self._log_status_msg(
                f"Stored {len(cluster_id2topic_id)} topics in the database corresponding to {len(cluster_ids)} clusters."
            )

            # 5. Store the cluster assignments in the database
            crud_document_topic.create_multi(
                db=db,
                create_dtos=[
                    DocumentTopicCreate(
                        sdoc_id=da.sdoc_id,
                        topic_id=cluster_id2topic_id[cluster],
                    )
                    for da, cluster in zip(doc_aspects, clusters)
                ],
            )
            self._log_status_msg(
                f"Assigned {len(doc_aspects)} document aspects to {len(cluster_id2topic_id)} topics."
            )

        return list(cluster_id2topic_id.values())

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
        vectorizer_model = CountVectorizer(
            ngram_range=(1, 1), lowercase=True, stop_words="english"
        )
        X = vectorizer_model.fit_transform(documents)
        words = vectorizer_model.get_feature_names_out().tolist()

        # Compute the class-based TF-IDF
        ctfidf_model = ClassTfidfTransformer(
            bm25_weighting=True, reduce_frequent_words=True
        )
        c_tf_idf = ctfidf_model.fit_transform(X)
        c_tf_idf = np.array(c_tf_idf.todense())  # type: ignore

        return c_tf_idf, words

    def _extract_topics(
        self,
        db: Session,
        aspect_id: int,
        topic_ids: Optional[List[int]],
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

        # 0. Read all required data
        # - Read the topics (but the outlier topic)
        all_topics = crud_topic.read_by_aspect_and_level(
            db=db, aspect_id=aspect_id, level=level
        )
        # - Read the document aspects
        doc_aspects, assigned_topics = (
            crud_document_aspect.read_by_aspect_and_topic_ids(
                db=db, aspect_id=aspect_id, topic_ids=[t.id for t in all_topics]
            )
        )
        assigned_topics_arr = np.array(assigned_topics)

        # determine which topics to update
        topic_ids_to_update = (
            topic_ids if topic_ids is not None else [topic.id for topic in all_topics]
        )
        self._log_status_msg(f"Extracting data for {len(topic_ids_to_update)} topics.")

        # 1. Identify key words for each topic
        # 1.1. Group the documents by topic, creating a "big" topicdocument per topic, which is required by c-TF-IDF
        topic_to_doc_aspects: Dict[int, List[DocumentAspectORM]] = {
            t.id: [] for t in all_topics
        }
        for da, topic_id in zip(doc_aspects, assigned_topics):
            topic_to_doc_aspects[topic_id].append(da)
        topic_to_topicdoc: Dict[int, str] = {
            t.id: " ".join([da.content for da in topic_to_doc_aspects[t.id]])
            if len(topic_to_doc_aspects[t.id]) > 0
            else "emptydoc"
            for t in all_topics
        }

        # 1.2 Compute the c-TF-IDF
        # The first row in c-TF-IDF corresponds to the first topic in tids, the second row to the second topic, etc.
        self._log_status_msg(f"Computing c-TF-IDF for {len(all_topics)} topics...")
        c_tf_idf, words = self.__c_tf_idf(
            documents_per_topic=list(topic_to_topicdoc.values())
        )

        # 1.3. Find the most important words for each topic
        scores, indices = torch.topk(torch.tensor(c_tf_idf), k=50)
        scores = scores.tolist()
        indices = indices.tolist()
        top_words: Dict[int, List[str]] = {}
        top_word_scores: Dict[int, List[float]] = {}
        for scores, indices, topic_id in zip(scores, indices, topic_to_topicdoc.keys()):
            top_words[topic_id] = [words[i] for i in indices]
            top_word_scores[topic_id] = [float(s) for s in scores]
        self._log_status_msg("Extracted top words and scores for each topic!")

        # 2. Generate topic name and description with LLM
        class OllamaResponse(BaseModel):
            description: str
            title: str

        topic_name: Dict[int, str] = {}
        topic_description: Dict[int, str] = {}
        self._log_status_msg("Generating topic names and descriptions with LLM...")
        for topic_id in topic_ids_to_update:
            tw = top_words[topic_id]
            self._log_status_msg(
                f"Generating name and description for topic {tw[:5]}..."
            )
            response = self.ollama.llm_chat(
                system_prompt="You are a topic name and description generator.",
                user_prompt=f"Generate a name and description for the topic with the following words: {', '.join(tw)}",
                response_model=OllamaResponse,
            )
            topic_name[topic_id] = response.title
            topic_description[topic_id] = response.description

        # 3. Based on embeddings...
        coordinates = np.array([[da.x, da.y] for da in doc_aspects])
        embedding_sdoc_ids = np.array([da.sdoc_id for da in doc_aspects])
        embeddings = np.array(
            crud_aspect_embedding.get_embeddings(
                project_id=aspect.project_id,
                ids=[
                    AspectObjectIdentifier(aspect_id=da.aspect_id, sdoc_id=da.sdoc_id)
                    for da in doc_aspects
                ],
            )
        )

        self._log_status_msg(
            f"Computing topic embeddings & top documents for {len(topic_ids_to_update)} topics."
        )
        topic_centroids: Dict[int, np.ndarray] = {}
        topic_coordinates: Dict[int, np.ndarray] = {}
        top_docs: Dict[int, List[int]] = {}
        distance_update_ids: List[
            Tuple[int, int]
        ] = []  # List of (sdoc_id, topic_id) tuples
        distance_update_dtos: List[DocumentTopicUpdate] = []
        for topic_id in topic_ids_to_update:
            doc_coordinates = coordinates[assigned_topics_arr == topic_id]
            doc_embeddings = embeddings[assigned_topics_arr == topic_id]
            sdoc_ids = embedding_sdoc_ids[assigned_topics_arr == topic_id]

            # ... compute the topic embeddings (cluster centroids)
            topic_centroids[topic_id] = np.mean(doc_embeddings, axis=0)

            # ... compute the topic coordinates (mean of the 2D coordinates)
            topic_coordinates[topic_id] = np.mean(doc_coordinates, axis=0)

            # .. compute the top 3 documents
            similarities = doc_embeddings @ topic_centroids[topic_id]
            num_top_docs_to_retrieve = min(3, len(doc_embeddings))
            top_doc_indices = np.argsort(similarities)[:num_top_docs_to_retrieve]
            top_doc_ids = [
                topic_to_doc_aspects[topic_id][i].sdoc_id for i in top_doc_indices
            ]
            top_docs[topic_id] = top_doc_ids

            # ... update the distances of the document topics
            for sdoc_id, similarity in zip(sdoc_ids, similarities):
                distance_update_ids.append((sdoc_id.item(), topic_id))
                distance_update_dtos.append(
                    DocumentTopicUpdate(distance=1.0 - similarity.item())
                )

        self._log_status_msg(
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
                for topic_id in topic_ids_to_update
            ],
            embeddings=[
                topic_centroids[topic_id].tolist() for topic_id in topic_ids_to_update
            ],
        )

        # ... store the topics in the database
        update_dtos: List[TopicUpdateIntern] = []
        for topic_id in topic_ids_to_update:
            update_dtos.append(
                TopicUpdateIntern(
                    name=topic_name[topic_id],
                    description=topic_description[topic_id],
                    top_words=top_words[topic_id],
                    top_word_scores=top_word_scores[topic_id],
                    top_docs=top_docs[topic_id],
                    x=topic_coordinates[topic_id][0],
                    y=topic_coordinates[topic_id][1],
                )
            )
        crud_topic.update_multi(db=db, ids=topic_ids_to_update, update_dtos=update_dtos)

        # ... update the document topics with the new distances
        if len(distance_update_dtos) > 0:
            # Update the distances of the document topics
            crud_document_topic.update_multi(
                db=db,
                ids=distance_update_ids,
                update_dtos=distance_update_dtos,
            )

        self._log_status_msg(
            f"Updated {len(update_dtos)} topics in the database with names, descriptions, top words, top word scores, and top documents."
        )

    def create_aspect(
        self,
        aspect_id: int,
        params: CreateAspectParams,
    ):
        with self.sqls.db_session() as db:
            # 1. Modify the documents based on the prompt
            self._log_status_step(0)
            self._modify_documents(
                db=db,
                aspect_id=aspect_id,
            )

            # 2. Embedd the documents based on the prompt
            self._log_status_step(1)
            self._embed_documents(
                db=db,
                aspect_id=aspect_id,
            )

            # 3. Cluster the documents
            self._log_status_step(2)
            self._cluster_documents(
                db=db,
                aspect_id=aspect_id,
                sdoc_ids=None,
                num_clusters=None,
            )

            # 4. Extract the topics
            self._log_status_step(3)
            self._extract_topics(
                db=db,
                aspect_id=aspect_id,
                topic_ids=None,
            )

            self._log_status_msg("Successfully created aspect!")

    def add_missing_docs_to_aspect(
        self,
        aspect_id: int,
        params: AddMissingDocsToAspectParams,
    ):
        pass

    def create_topic_with_name(self, aspect_id: int, params: CreateTopicWithNameParams):
        with self.sqls.db_session() as db:
            # Read the aspect
            aspect = crud_aspect.read(db=db, id=aspect_id)

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

            # 1. Topic creation
            # - Embedd the new topic
            self._log_status_step(0)
            self._log_status_msg(
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

            # - Create the new topic in the database
            new_topic = crud_topic.create(
                db=db,
                create_dto=TopicCreateIntern(
                    parent_topic_id=params.create_dto.parent_topic_id,
                    aspect_id=params.create_dto.aspect_id,
                    level=params.create_dto.level,
                    name=params.create_dto.name,
                    description=params.create_dto.description,
                    is_outlier=False,
                ),
            )

            # 2. Document assignment
            # - For all source documents in the aspect, decide whether to assign the new topic or not. Track the changes/affected topics!
            # - Do not reassign documents that are accepted
            self._log_status_step(1)
            update_dtos: List[DocumentTopicUpdate] = []
            update_ids: List[tuple[int, int]] = []
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
                if doc_topic.is_accepted:
                    # skip documents that are already accepted
                    continue

                # assign the new topic if the distance is smaller than the current topic's distance
                if result.score < doc_topic.distance:
                    update_ids.append((doc_topic.sdoc_id, doc_topic.topic_id))
                    update_dtos.append(
                        DocumentTopicUpdate(
                            topic_id=new_topic.id,
                            distance=result.score,
                        )
                    )
                    # track changes
                    modified_topics.add(doc_topic.topic_id)
                    modified_topics.add(new_topic.id)

            # - Store the new topic assignments in the database
            if len(update_dtos) > 0:
                crud_document_topic.update_multi(
                    db=db, ids=update_ids, update_dtos=update_dtos
                )
                self._log_status_msg(
                    f"Updated {len(update_dtos)} document-topic assignments with the new topic {new_topic.id}."
                )

            # 3. Topic Extraction
            # - Extract the topics for all affected ones (computing top words, top docs, embedding, etc)
            self._log_status_step(2)
            if len(modified_topics) > 0:
                self._log_status_msg(
                    f"Extracting topics for {len(modified_topics)} modified topics: {modified_topics}."
                )
                self._extract_topics(
                    db=db,
                    aspect_id=aspect.id,
                    topic_ids=list(modified_topics),
                )

            self._log_status_msg("Successfully created topic with name&description!")

    def create_topic_with_sdocs(
        self, aspect_id: int, params: CreateTopicWithSdocsParams
    ):
        with self.sqls.db_session() as db:
            # Read the current document <-> topic assignments
            document_topics = crud_document_topic.read_by_aspect(
                db=db, aspect_id=aspect_id
            )
            doc2topic: Dict[int, DocumentTopicORM] = {
                dt.sdoc_id: dt for dt in document_topics
            }
            assert (
                len(document_topics) == len(doc2topic)
            ), f"There are duplicate document-topic assignments in the database for aspect {aspect_id}!"

            # 1. Topic creation
            # - Create the new topic in the database
            self._log_status_step(0)
            self._log_status_msg("Creating new empty topic...")
            new_topic = crud_topic.create(
                db=db,
                create_dto=TopicCreateIntern(
                    name="New Topic",
                    aspect_id=aspect_id,
                    level=0,
                    is_outlier=False,
                ),
            )

            # 2. Document assignment
            # - Assign the new topic to the given source documents
            self._log_status_step(1)
            self._log_status_msg(
                f"Assigning new topic {new_topic.id} to {len(params.sdoc_ids)} source documents..."
            )
            # track the changes/affected topics!
            modified_topics: Set[int] = set(
                [doc2topic[sdoc_id].topic_id for sdoc_id in params.sdoc_ids]
            )
            modified_topics.add(new_topic.id)
            # assign the new topic to the source documents
            crud_document_topic.set_labels2(
                db=db,
                aspect_id=aspect_id,
                topic_id=new_topic.id,
                sdoc_ids=params.sdoc_ids,
                is_accepted=True,
            )

            # 3. Topic Extraction
            # - Extract the topics for all affected ones (computing top words, top docs, embedding, etc)
            self._log_status_step(2)
            if len(modified_topics) > 0:
                self._log_status_msg(
                    f"Extracting topics for {len(modified_topics)} modified topics: {modified_topics}."
                )
                self._extract_topics(
                    db=db,
                    aspect_id=aspect_id,
                    topic_ids=list(modified_topics),
                )

            self._log_status_msg("Successfully created topic with source documents!")

    def remove_topic(self, aspect_id: int, params: RemoveTopicParams):
        with self.sqls.db_session() as db:
            # 0. Read all relevant data
            # - Read the topic to remove
            topic = crud_topic.read(db=db, id=params.topic_id)

            # - Read the aspect
            aspect = topic.aspect

            # - Read the document aspect embeddings of all affected documents
            doc_aspects = crud_document_aspect.read_by_aspect_and_topic_id(
                db=db, aspect_id=topic.aspect_id, topic_id=topic.id
            )
            embedding_ids = [
                AspectObjectIdentifier(aspect_id=da.aspect_id, sdoc_id=da.sdoc_id)
                for da in doc_aspects
            ]
            document_embeddings = np.array(
                crud_aspect_embedding.get_embeddings(
                    project_id=aspect.project_id,
                    ids=embedding_ids,
                )
            )

            # - Read all topic embeddings, but exclude the topic to remove
            te_search_result = crud_topic_embedding.find_embeddings_by_aspect_id(
                project_id=aspect.project_id,
                aspect_id=topic.aspect_id,
            )
            topic_embeddings = np.array(
                [te.embedding for te in te_search_result if te.id.topic_id != topic.id]
            )
            topic_ids = [
                te.id.topic_id for te in te_search_result if te.id.topic_id != topic.id
            ]

            # - Read the current document-topic assignments (which will be updated)
            document_topics = crud_document_topic.read_by_aspect_and_topic_id(
                db=db, aspect_id=topic.aspect_id, topic_id=topic.id
            )

            assert (
                len(embedding_ids) == len(document_topics)
            ), "The number of document aspect embeddings does not match the number of document topics."

            # 1. Document Assignment
            # - Compute the similarities of the document embeddings to the remaining topic embeddings
            self._log_status_step(0)

            similarities = document_embeddings @ topic_embeddings.T

            # - For each document aspect, find the most similar topic embedding and update the document topic assignment
            modified_topics: Set[int] = set()
            sdoc_id2new_topic_id: Dict[int, int] = {}
            sdoc_id2new_topic_distance: Dict[int, float] = {}
            for da, similarity in zip(doc_aspects, similarities):
                most_similar_topic_index = np.argmax(similarity)
                most_similar_topic_id = topic_ids[most_similar_topic_index]

                sdoc_id2new_topic_id[da.sdoc_id] = most_similar_topic_id
                sdoc_id2new_topic_distance[da.sdoc_id] = (
                    1.0 - similarity[most_similar_topic_index].item()
                )
                modified_topics.add(most_similar_topic_id)

            # - Update the document-topic assignments in the database
            update_dtos: List[DocumentTopicUpdate] = []
            update_ids: List[tuple[int, int]] = []
            for dt in document_topics:
                update_dtos.append(
                    DocumentTopicUpdate(
                        topic_id=sdoc_id2new_topic_id[dt.sdoc_id],
                        distance=sdoc_id2new_topic_distance[dt.sdoc_id],
                        is_accepted=False,  # Reset acceptance status
                    )
                )
                update_ids.append((dt.sdoc_id, dt.topic_id))

            if len(update_dtos) > 0:
                crud_document_topic.update_multi(
                    db=db, ids=update_ids, update_dtos=update_dtos
                )
                self._log_status_msg(
                    f"Updated {len(update_dtos)} document-topic assignments to the most similar topics."
                )

            # 2. Topic Removal: Remove the topic from the database
            self._log_status_step(1)
            crud_topic.remove(db=db, id=params.topic_id)
            crud_topic_embedding.remove_embedding(
                project_id=aspect.project_id,
                id=TopicObjectIdentifier(
                    aspect_id=aspect.id,
                    topic_id=params.topic_id,
                ),
            )

            # 3. Topic Extraction: Extract the topics for all affected ones (computing top words, top docs, embedding, etc)
            self._log_status_step(2)
            if len(modified_topics) > 0:
                self._log_status_msg(
                    f"Extracting topics for {len(modified_topics)} modified topics: {modified_topics}."
                )
                self._extract_topics(
                    db=db,
                    aspect_id=aspect.id,
                    topic_ids=list(modified_topics),
                )

            self._log_status_msg("Successfully removed topic!")

    def merge_topics(self, aspect_id: int, params: MergeTopicsParams):
        with self.sqls.db_session() as db:
            # 0. Read the topics to merge
            topic1 = crud_topic.read(db=db, id=params.topic_to_keep)
            topic2 = crud_topic.read(db=db, id=params.topic_to_merge)
            aspect = topic1.aspect
            assert (
                topic1.aspect_id == topic2.aspect_id
            ), "Cannot merge topics from different aspects."

            # 1. Merge the topics (updating the topic id)
            self._log_status_step(0)
            crud_document_topic.merge_topics(
                db=db,
                topic_to_keep=params.topic_to_keep,
                topic_to_merge=params.topic_to_merge,
            )

            # 2. Delete the merged topic from the database
            self._log_status_step(1)
            crud_topic.remove(db=db, id=params.topic_to_merge)
            crud_topic_embedding.remove_embedding(
                project_id=aspect.project_id,
                id=TopicObjectIdentifier(
                    aspect_id=aspect.id,
                    topic_id=params.topic_to_merge,
                ),
            )
            self._log_status_msg(
                f"Merged topics {params.topic_to_keep} and {params.topic_to_merge}."
            )

            # 3. Extract the topics for the remaining topic (computing top words, top docs, embedding, etc)
            self._log_status_step(2)
            self._extract_topics(
                db=db,
                aspect_id=aspect.id,
                topic_ids=[params.topic_to_keep],
            )

            self._log_status_msg("Successfully merged topics!")

    def split_topic(self, aspect_id: int, params: SplitTopicParams):
        with self.sqls.db_session() as db:
            # 0. Read the topic to split
            topic = crud_topic.read(db=db, id=params.topic_id)
            aspect = topic.aspect

            # 0. Find all sdoc_ids associated with the topic
            sdoc_ids = [
                da.sdoc_id
                for da in crud_document_aspect.read_by_aspect_and_topic_id(
                    db=db, aspect_id=topic.aspect_id, topic_id=topic.id
                )
            ]
            assert len(sdoc_ids) > 0, "Cannot split a topic without document aspects."
            self._log_status_msg(
                f"Found {len(sdoc_ids)} source documents associated with topic {params.topic_id}."
            )

            # 1. Remove the topic from the database
            self._log_status_step(0)
            crud_topic.remove(db=db, id=params.topic_id)
            crud_topic_embedding.remove_embedding(
                project_id=aspect.project_id,
                id=TopicObjectIdentifier(
                    aspect_id=aspect.id,
                    topic_id=params.topic_id,
                ),
            )
            self._log_status_msg(f"Removed topic {params.topic_id} from the database.")

            # 2. Cluster the documents, creating new topics and assigning them to the documents
            self._log_status_step(1)
            created_topic_ids = self._cluster_documents(
                db=db,
                aspect_id=aspect.id,
                sdoc_ids=sdoc_ids,  # TODO: could be optimized by providing the document aspects directly
                num_clusters=None,
            )

            # 3. Extract the topics
            self._log_status_step(2)
            self._extract_topics(
                db=db,
                aspect_id=aspect.id,
                topic_ids=created_topic_ids,
            )

            self._log_status_msg("Successfully split topic!")

    def change_topic(self, aspect_id: int, params: ChangeTopicParams):
        with self.sqls.db_session() as db:
            # 0. Read the topic to change to
            if params.topic_id == -1:
                topic = crud_topic.read_or_create_outlier_topic(
                    db=db, aspect_id=aspect_id, level=0
                )
                topic_id = topic.id
            else:
                topic = crud_topic.read(db=db, id=params.topic_id)
                topic_id = topic.id

            # Read the current document <-> topic assignments
            document_topics = crud_document_topic.read_by_aspect(
                db=db, aspect_id=aspect_id
            )
            doc2topic: Dict[int, DocumentTopicORM] = {
                dt.sdoc_id: dt for dt in document_topics
            }

            # 1. Document assignment
            # - Assign the new topic to the given source documents
            self._log_status_step(0)
            self._log_status_msg(
                f"Assigning the topic '{topic.name}' to {len(params.sdoc_ids)} documents..."
            )
            # track the changes/affected topics!
            modified_topics: Set[int] = set(
                [doc2topic[sdoc_id].topic_id for sdoc_id in params.sdoc_ids]
            )
            modified_topics.add(topic_id)
            # assign the topic to the source documents
            crud_document_topic.set_labels2(
                db=db,
                aspect_id=aspect_id,
                topic_id=topic.id,
                sdoc_ids=params.sdoc_ids,
                is_accepted=True,
            )

            # 2. Topic Extraction
            # - Extract the topics for all affected ones (computing top words, top docs, embedding, etc)
            self._log_status_step(1)
            if len(modified_topics) > 0:
                self._log_status_msg(
                    f"Extracting topics for {len(modified_topics)} modified topics: {modified_topics}."
                )
                self._extract_topics(
                    db=db,
                    aspect_id=aspect_id,
                    topic_ids=list(modified_topics),
                )

            self._log_status_msg("Successfully changed topic!")

    def refine_topic_model(self, aspect_id: int, params: RefineTopicModelParams):
        with self.sqls.db_session() as db:
            # Update the model name, so that a new model is trained
            aspect = crud_aspect.read(db=db, id=aspect_id)
            model_name = f"project_{aspect.project_id}_aspect_{aspect.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            crud_aspect.update(
                db=db,
                id=aspect_id,
                update_dto=AspectUpdateIntern(
                    embedding_model=model_name,
                ),
            )

            # 1. Build the training data for the embedding model
            self._log_status_step(0)
            self._log_status_msg("Building training data for the embedding model...")
            train_docs, train_labels, train_doc_ids = self.__build_training_data(
                db=db,
                aspect_id=aspect_id,
            )

            # 2. Embed the documents (training the model)
            self._log_status_step(1)
            self._log_status_msg(
                f"Refining topic model for aspect {aspect_id} with model {model_name}."
            )
            self._embed_documents(
                db=db,
                aspect_id=aspect_id,
                train_docs=train_docs,
                train_labels=train_labels,
            )

            # 3. Cluster the documents
            self._log_status_step(2)
            self._cluster_documents(
                db=db,
                aspect_id=aspect_id,
                sdoc_ids=None,
                num_clusters=None,
                train_doc_ids=train_doc_ids,
                train_topic_ids=[int(tl) for tl in train_labels],
            )

            # 4. Extract the topics
            self._log_status_step(3)
            self._extract_topics(
                db=db,
                aspect_id=aspect_id,
                topic_ids=None,
            )

            self._log_status_msg("Successfully refined map!")

    def reset_topic_model(self, aspect_id: int, params: ResetTopicModelParams):
        pass
