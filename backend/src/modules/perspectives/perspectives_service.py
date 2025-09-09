import re
from collections import Counter, defaultdict
from datetime import datetime
from typing import Callable

import joblib
import matplotlib.pyplot as plt
import numpy as np
from hdbscan import HDBSCAN
from loguru import logger
from matplotlib.axes import Axes
from matplotlib.figure import Figure
from pydantic import BaseModel
from sklearn.feature_extraction.text import CountVectorizer
from sqlalchemy.orm import Session
from umap import UMAP
from weaviate import WeaviateClient

from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.aspect_dto import AspectUpdateIntern
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.aspect_embedding_dto import AspectObjectIdentifier
from modules.perspectives.cluster_crud import crud_cluster
from modules.perspectives.cluster_dto import ClusterCreateIntern, ClusterUpdateIntern
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.ctfidf import ClassTfidfTransformer
from modules.perspectives.document_aspect_crud import crud_document_aspect
from modules.perspectives.document_aspect_dto import (
    DocumentAspectCreate,
    DocumentAspectUpdate,
)
from modules.perspectives.document_aspect_orm import DocumentAspectORM
from modules.perspectives.document_cluster_crud import crud_document_cluster
from modules.perspectives.document_cluster_dto import (
    DocumentClusterCreate,
    DocumentClusterUpdate,
)
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from modules.perspectives.perspectives_job_dto import (
    AddMissingDocsToAspectParams,
    ChangeClusterParams,
    CreateAspectParams,
    CreateClusterWithNameParams,
    CreateClusterWithSdocsParams,
    MergeClustersParams,
    PerspectivesJobInput,
    PerspectivesJobParams,
    PerspectivesJobType,
    RefineModelParams,
    RemoveClusterParams,
    ResetModelParams,
    SplitClusterParams,
)
from modules.perspectives.prompt_embedder import (
    PromptEmbedder,
    PromptEmbedderInput,
)
from repos.filesystem_repo import FilesystemRepo
from repos.llm_repo import LLMRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import Job


class PerspectivesService:
    def __init__(self, job: Job):
        self.job = job

        self.llm: LLMRepo = LLMRepo()
        self.weaviate: WeaviateRepo = WeaviateRepo()
        self.fsr: FilesystemRepo = FilesystemRepo()

        self.prompt_embedder = PromptEmbedder(device=job.get_device())

        self.perspectives_job_steps: dict[PerspectivesJobType, list[str]] = {
            PerspectivesJobType.CREATE_ASPECT: [
                "Document Modification",
                "Document Embedding",
                "Document Clustering",
                "Cluster Extraction",
            ],
            PerspectivesJobType.CREATE_CLUSTER_WITH_NAME: [
                "Cluster Creation",
                "Document Assignment",
                "Cluster Extraction",
            ],
            PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS: [
                "Cluster Creation",
                "Document Assignment",
                "Cluster Extraction",
            ],
            PerspectivesJobType.REMOVE_CLUSTER: [
                "Document Assignment",
                "Cluster Removal",
                "Cluster Extraction",
            ],
            PerspectivesJobType.MERGE_CLUSTERS: [
                "Merge Clusters",
                "Cluster Removal",
                "Cluster Extraction",
            ],
            PerspectivesJobType.SPLIT_CLUSTER: [
                "Remove Cluster",
                "Document Clustering",
                "Cluster Extraction",
            ],
            PerspectivesJobType.CHANGE_CLUSTER: [
                "Document Assignment",
                "Cluster Extraction",
            ],
            PerspectivesJobType.REFINE_MODEL: [
                "Prepare Training Data",
                "Train & Embedd",
                "Document Clustering",
                "Cluster Extraction",
            ],
            PerspectivesJobType.ADD_MISSING_DOCS_TO_ASPECT: [
                "Add Missing Docs to Aspect"
            ],
            PerspectivesJobType.RESET_MODEL: ["Reset Cluster Model"],
        }
        self.method_for_job_type: dict[
            PerspectivesJobType, Callable[[Session, int, PerspectivesJobParams], None]
        ] = {
            PerspectivesJobType.CREATE_ASPECT: self.create_aspect,
            PerspectivesJobType.ADD_MISSING_DOCS_TO_ASPECT: self.add_missing_docs_to_aspect,
            PerspectivesJobType.CREATE_CLUSTER_WITH_NAME: self.create_cluster_with_name,
            PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS: self.create_cluster_with_sdocs,
            PerspectivesJobType.REMOVE_CLUSTER: self.remove_cluster,
            PerspectivesJobType.MERGE_CLUSTERS: self.merge_clusters,
            PerspectivesJobType.SPLIT_CLUSTER: self.split_cluster,
            PerspectivesJobType.CHANGE_CLUSTER: self.change_cluster,
            PerspectivesJobType.REFINE_MODEL: self.refine_cluster_model,
            PerspectivesJobType.RESET_MODEL: self.reset_cluster_model,
        }

    def handle_perspectives_job(self, db: Session, payload: PerspectivesJobInput):
        # Set initial status
        self.job.update(
            current_step=0,
            status_message="Waiting...",
            steps=self.perspectives_job_steps.get(payload.perspectives_job_type, []),
        )

        # Execute the correct function
        self.method_for_job_type[payload.perspectives_job_type](
            db, payload.aspect_id, payload.parameters
        )

    def _log_status_msg(self, status_msg: str):
        self.job.update(status_message=status_msg)
        logger.info(status_msg)

    def _log_status_step(self, step: int):
        self.job.update(current_step=step)

    def _modify_documents(self, db: Session, aspect_id: int):
        aspect = crud_aspect.read(db=db, id=aspect_id)

        # 1. Find all text source documents that do not have an aspect yet
        sdoc_data = [
            (data.id, data.content)
            for data in crud_document_aspect.read_text_data_with_no_aspect(
                db=db, aspect_id=aspect_id, project_id=aspect.project_id
            )
        ]
        self._log_status_msg(
            f"Found {len(sdoc_data)} source documents without an aspect. Modifying them..."
        )

        # 2. Modify the documents
        class LLMResponse(BaseModel):
            content: str

        create_dtos: list[DocumentAspectCreate] = []
        if aspect.doc_modification_prompt:
            # if prompt is provided, use LLM to generate a modified document
            for idx, (sdoc_id, sdoc_content) in enumerate(sdoc_data):
                self._log_status_msg(
                    f"Modifying documents with LLM ({idx + 1} / {len(sdoc_data)})..."
                )

                response = self.llm.llm_chat(
                    system_prompt="You are a document modification assistant.",
                    user_prompt=aspect.doc_modification_prompt,
                    response_model=LLMResponse,
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
        doc_aspects: list[DocumentAspectORM],
        train_docs: list[str] | None = None,
        train_labels: list[str] | None = None,
    ) -> tuple[list[list[float]], list[tuple[float, float]]]:
        assert len(doc_aspects) > 0, "No document aspects provided."

        # 1. Embed the document aspects
        self._log_status_msg(
            f"Computing embeddings for {len(doc_aspects)} document aspects with model {embedding_model}..."
        )
        embedding_output = self.prompt_embedder.embed(
            input=PromptEmbedderInput(
                project_id=project_id,
                model_name=embedding_model,
                prompt=embedding_prompt,
                data=[da.content for da in doc_aspects],
                train_docs=train_docs,
                train_labels=train_labels,
            ),
        )
        assert len(embedding_output.embeddings) == len(doc_aspects), (
            "The number of embeddings does not match the number of documents."
        )

        # 2. Compute the 2D coordinates
        umap_model_path = self.fsr.get_model_dir(
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

    def __generate_map_thumbnail(
        self,
        db: Session,
        aspect_id: int,
    ) -> None:
        # Read all relevant data
        aspect = crud_aspect.read(db=db, id=aspect_id)
        doc_aspects = aspect.document_aspects
        doc_clusters = crud_document_cluster.read_by_aspect_id(
            db=db, aspect_id=aspect_id
        )
        doc_id2_dt = {dt.sdoc_id: dt for dt in doc_clusters}

        # Prepare data for the map
        coords_x: list[float] = []
        coords_y: list[float] = []
        labels: list[int] = []
        for da in doc_aspects:
            coords_x.append(da.x)
            coords_y.append(da.y)
            labels.append(doc_id2_dt[da.sdoc_id].cluster_id)

        # Generate the map thumbnail
        width_inches = 5.12  # 512 pixels at 100 DPI
        height_inches = 5.12  # 512 pixels at 100 DPI
        dpi = 100  # Dots per inch

        figure, axis = plt.subplots(figsize=(width_inches, height_inches), dpi=dpi)
        assert isinstance(figure, Figure), "Figure is not an instance of Figure"
        assert isinstance(axis, Axes), "Axis is not an instance of Axes"
        axis.scatter(
            coords_x, coords_y, c=labels, cmap="tab20", s=10
        )  # s is marker size
        axis.set_frame_on(False)  # Removes the frame/spines;
        axis.xaxis.set_visible(False)  # Ensure x-axis line/labels are not visible
        axis.yaxis.set_visible(False)  # Ensure y-axis line/labels are not visible
        axis.grid(False)
        figure.subplots_adjust(left=0, bottom=0, right=1, top=1, wspace=0, hspace=0)

        # Save the map thumbnail
        output_path = self.fsr.get_plot_path(
            proj_id=aspect.project_id,
            plot_name=f"aspect_{aspect_id}_map_thumbnail.png",
        )
        plt.savefig(output_path, dpi=dpi, pad_inches=0)
        plt.close(figure)  # Close the figure to free memory
        self._log_status_msg(f"Generated map thumbnail at {output_path}")

    def _embed_documents(
        self,
        db: Session,
        client: WeaviateClient,
        aspect_id: int,
        sdoc_ids: list[int] | None = None,
        train_docs: list[str] | None = None,
        train_labels: list[str] | None = None,
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
                client=client,
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

    def __find_new_to_old_cluster_mapping(
        self,
        labeled_documents: list[tuple[int, int]],
    ) -> dict[int, int]:
        """
        Maps new cluster IDs to the most frequent old cluster ID.

        Input is a list of (old_cluster_id, new_cluster_id) integer pairs.

        Args:
            labeled_documents: List of (old_cluster_id, new_cluster_id) tuples.

        Returns:
            Dictionary mapping new_cluster_id (int) to its most frequent
            associated old_cluster_id (int).
        """
        new_cluster_to_old_cluster_candidates: dict[int, list[int]] = defaultdict(list)

        # Group old_ids by new_id
        for old_id, new_id in labeled_documents:
            new_cluster_to_old_cluster_candidates[new_id].append(old_id)

        final_mapping: dict[int, int] = {}
        # For each new_id, find the most common old_id
        for new_id, old_id_list in new_cluster_to_old_cluster_candidates.items():
            count: Counter[int] = Counter(old_id_list)
            most_common_old_id: int = count.most_common(1)[0][0]
            final_mapping[new_id] = most_common_old_id

        return final_mapping

    def _cluster_documents(
        self,
        db: Session,
        client: WeaviateClient,
        aspect_id: int,
        sdoc_ids: list[int] | None,
        num_clusters: int | None,
        train_doc_ids: list[int] = [],
        train_cluster_ids: list[int] = [],
    ) -> list[int]:
        """
        Clusters the document aspects of the given Aspect using HDBSCAN.
        If sdoc_ids are provided, only those source documents will be clustered.
        :param db: The database session
        :param aspect_id: The ID of the Aspect
        :return: List of cluster IDs that were assigned to the documents.
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
                client=client,
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
        hdb_clusters = hdbscan_model.fit_predict(reduced_embeddings).tolist()
        hdb_cluster_ids = set(hdb_clusters)
        self._log_status_msg(f"Found {len(hdb_cluster_ids)} clusters with HDBSCAN")

        # 4. Storing / reusing the clusters
        if len(train_doc_ids) > 0 and len(train_cluster_ids) > 0:
            # Either: Reuse existing clusters, automatically inferring a mapping from existing clusters to clusters
            train_doc2top: dict[int, int] = {
                doc_id: cluster_id
                for doc_id, cluster_id in zip(train_doc_ids, train_cluster_ids)
            }
            new_doc2top: dict[int, int] = {
                da.sdoc_id: cluster for da, cluster in zip(doc_aspects, hdb_clusters)
            }
            labeled_docs = [
                (train_doc2top[doc_id], new_doc2top[doc_id]) for doc_id in train_doc_ids
            ]
            hdb_cluster_id2db_cluster_id = self.__find_new_to_old_cluster_mapping(
                labeled_docs
            )

            # add mapping for outlier cluster
            outlier_cluster = crud_cluster.read_or_create_outlier_cluster(
                db=db, aspect_id=aspect_id, level=0
            )
            hdb_cluster_id2db_cluster_id[-1] = (
                outlier_cluster.id
            )  # -1 is the outlier cluster ID
            self._log_status_msg(
                f"Computed a mapping from {len(hdb_cluster_id2db_cluster_id)} clusters to existing clusters."
            )

            # Construct update DTOS
            doc_clusters = crud_document_cluster.read_by_aspect_id(
                db=db, aspect_id=aspect_id
            )
            sdoc_id2doccluster = {dt.sdoc_id: dt for dt in doc_clusters}
            update_dtos: list[DocumentClusterUpdate] = []
            update_ids: list[tuple[int, int]] = []
            for da, hdb_cluster in zip(doc_aspects, hdb_clusters):
                if da.sdoc_id in train_doc_ids:
                    continue  # Skip documents that were used for training!

                dt = sdoc_id2doccluster[da.sdoc_id]
                if dt.is_accepted:
                    continue  # Skip already accepted assignments!

                new_cluster_id = hdb_cluster_id2db_cluster_id[hdb_cluster]
                if dt.cluster_id == new_cluster_id:
                    continue

                # Update the document cluster with the new cluster ID
                update_ids.append(
                    (
                        dt.sdoc_id,
                        dt.cluster_id,
                    )
                )
                update_dtos.append(
                    DocumentClusterUpdate(
                        cluster_id=new_cluster_id,
                    )
                )

            # Update!
            crud_document_cluster.update_multi(
                db=db,
                ids=update_ids,
                update_dtos=update_dtos,
            )
            self._log_status_msg(
                f"Updated {len(update_ids)}/{len(doc_clusters)} document cluster assignments."
            )

        else:
            # Or: Store the clusters (clusters) in the DB
            hdb_cluster_id2db_cluster_id: dict[int, int] = {}

            # Treat outlier cluster separately. We only want 1 outlier cluster per aspect.
            if -1 in hdb_cluster_ids:
                outlier_cluster = crud_cluster.read_or_create_outlier_cluster(
                    db=db, aspect_id=aspect_id, level=0
                )
                hdb_cluster_ids.remove(-1)
                hdb_cluster_id2db_cluster_id[-1] = outlier_cluster.id

            db_clusters = crud_cluster.create_multi(
                db=db,
                create_dtos=[
                    ClusterCreateIntern(
                        aspect_id=aspect_id,
                        level=0,
                        name=None,
                        is_outlier=False,
                    )
                    for cluster_id in hdb_cluster_ids
                ],
            )
            for hdb_cluster_id, db_cluster in zip(hdb_cluster_ids, db_clusters):
                hdb_cluster_id2db_cluster_id[hdb_cluster_id] = db_cluster.id

            self._log_status_msg(
                f"Stored {len(hdb_cluster_id2db_cluster_id)} clusters in the database corresponding to {len(hdb_cluster_ids)} clusters."
            )

            # 5. Store the cluster assignments in the database
            crud_document_cluster.create_multi(
                db=db,
                create_dtos=[
                    DocumentClusterCreate(
                        sdoc_id=da.sdoc_id,
                        cluster_id=hdb_cluster_id2db_cluster_id[hdb_cluster],
                    )
                    for da, hdb_cluster in zip(doc_aspects, hdb_clusters)
                ],
            )
            self._log_status_msg(
                f"Assigned {len(doc_aspects)} document aspects to {len(hdb_cluster_id2db_cluster_id)} clusters."
            )

        # 5. Generate a map thumbnail
        self._log_status_msg("Generating map thumbnail for the map...")
        self.__generate_map_thumbnail(
            db=db,
            aspect_id=aspect.id,
        )

        return list(hdb_cluster_id2db_cluster_id.values())

    def __preprocess_text(self, documents: list[str]) -> list[str]:
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
        documents_per_cluster: list[str],
    ) -> tuple[np.ndarray, list[str]]:
        """Calculate a class-based TF-IDF where m is the number of total documents.

        Arguments:
            documents_per_cluster: The joined documents per cluster such that each cluster has a single
                                 string made out of multiple documents
            m: The total number of documents (unjoined)
            fit: Whether to fit a new vectorizer or use the fitted self.vectorizer_model
            partial_fit: Whether to run `partial_fit` for online learning

        Returns:
            tf_idf: The resulting matrix giving a value (importance score) for each word per cluster
            words: The names of the words to which values were given
        """
        documents = self.__preprocess_text(documents_per_cluster)

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

    def __compute_top_words(
        self,
        db: Session,
        all_cluster_ids: list[int],
        doc_aspects: list[DocumentAspectORM],
        assigned_clusters: list[int],
    ) -> tuple[dict[int, list[str]], dict[int, list[float]]]:
        # 1.1. Group the documents by cluster, creating a "big" clusterdocument per cluster, which is required by c-TF-IDF
        cluster_to_doc_aspects: dict[int, list[DocumentAspectORM]] = {
            cid: [] for cid in all_cluster_ids
        }
        for da, cluster_id in zip(doc_aspects, assigned_clusters):
            cluster_to_doc_aspects[cluster_id].append(da)
        cluster_to_clusterdoc: dict[int, str] = {
            cid: " ".join([da.content for da in cluster_to_doc_aspects[cid]])
            if len(cluster_to_doc_aspects[cid]) > 0
            else "emptydoc"
            for cid in all_cluster_ids
        }

        # 1.2 Compute the c-TF-IDF
        # The first row in c-TF-IDF corresponds to the first cluster in tids, the second row to the second cluster, etc.
        self._log_status_msg(
            f"Computing c-TF-IDF for {len(all_cluster_ids)} clusters..."
        )
        c_tf_idf, words = self.__c_tf_idf(
            documents_per_cluster=[
                cluster_to_clusterdoc[cid] for cid in all_cluster_ids
            ]
        )

        # 1.3. Find the most important words for each cluster
        # Use numpy to get top-k values and indices for each cluster (row)
        k = 50
        top_words: dict[int, list[str]] = {}
        top_word_scores: dict[int, list[float]] = {}
        for row, cluster_id in zip(c_tf_idf, all_cluster_ids):
            # Get indices of top-k elements in descending order
            if len(row) < k:
                topk_idx = np.argsort(row)[::-1]
            else:
                topk_idx = np.argpartition(row, -k)[-k:]
                # Sort these top-k indices by value descending
                topk_idx = topk_idx[np.argsort(row[topk_idx])[::-1]]
            top_words[cluster_id] = [words[i] for i in topk_idx]
            top_word_scores[cluster_id] = [float(row[i]) for i in topk_idx]

        self._log_status_msg("Extracted top words and scores for each cluster!")

        return top_words, top_word_scores

    def _extract_clusters(
        self,
        db: Session,
        client: WeaviateClient,
        aspect_id: int,
        cluster_ids: list[int] | None,
    ):
        """
        Extracts all topis of the given Aspect by:
        1. Finding the most important words for each cluster ( group documents by cluster, create one "big" document per cluster, compute c-TF-IDF, identify top words )
        2. Generating cluster name and description with LLM
        3. Computing the cluster embeddings (cluster centroids)
        4. Identifying the top similar documents
        5. Storing the clusters in the database and vector DB
        :param db: The database session
        :param aspect_id: The ID of the Aspect
        :param cluster_ids: Optional list of cluster IDs to consider. If None, all clusters for the aspect will be considered.
        :return: None
        """

        aspect = crud_aspect.read(db=db, id=aspect_id)
        level = 0  # TODO: we only consider 1 level for now (level 0)

        # 0. Read all required data
        # - Read the clusters
        all_clusters = crud_cluster.read_by_aspect_and_level(
            db=db, aspect_id=aspect_id, level=level
        )
        # - Read all document aspects
        doc_aspects = crud_document_aspect.read_by_aspect_id(db=db, aspect_id=aspect_id)
        doc_aspects.sort(key=lambda da: da.sdoc_id)  # Sort by source document ID
        doc_clusters = crud_document_cluster.read_by_aspect_id(
            db=db, aspect_id=aspect_id
        )
        doc_clusters.sort(key=lambda dt: dt.sdoc_id)  # Sort by source document ID

        assigned_clusters: list[int] = []
        assert len(doc_aspects) == len(doc_clusters), (
            "The number of aspects and cluster assignments does not match."
        )
        for da, dt in zip(doc_aspects, doc_clusters):
            if da.sdoc_id != dt.sdoc_id:
                raise ValueError(
                    f"DocumentAspect and DocumentCluster do not match: {da.sdoc_id} != {dt.sdoc_id}"
                )
            assigned_clusters.append(dt.cluster_id)

        # determine which clusters to update
        cluster_ids_to_update = (
            cluster_ids
            if cluster_ids is not None
            else [cluster.id for cluster in all_clusters]
        )
        self._log_status_msg(
            f"Extracting data for {len(cluster_ids_to_update)} clusters."
        )

        # 1. Identify key words for each cluster
        top_words, top_word_scores = self.__compute_top_words(
            db=db,
            all_cluster_ids=[c.id for c in all_clusters],
            doc_aspects=doc_aspects,
            assigned_clusters=assigned_clusters,
        )

        # 2. Generate cluster name and description with LLM
        class LLMResponse(BaseModel):
            description: str
            title: str

        cluster_name: dict[int, str] = {}
        cluster_description: dict[int, str] = {}
        self._log_status_msg("Generating cluster names and descriptions with LLM...")
        for cluster_id in cluster_ids_to_update:
            tw = top_words[cluster_id]
            self._log_status_msg(
                f"Generating name and description for cluster {tw[:5]}..."
            )
            response = self.llm.llm_chat(
                system_prompt="You are a cluster name and description generator.",
                user_prompt=f"Generate a name and description for the cluster with the following words: {', '.join(tw)}",
                response_model=LLMResponse,
            )
            cluster_name[cluster_id] = response.title
            cluster_description[cluster_id] = response.description

        # 3. Based on embeddings...
        coordinates = np.array([[da.x, da.y] for da in doc_aspects])
        embedding_sdoc_ids = np.array([da.sdoc_id for da in doc_aspects])
        embeddings = np.array(
            crud_aspect_embedding.get_embeddings(
                client=client,
                project_id=aspect.project_id,
                ids=[
                    AspectObjectIdentifier(aspect_id=da.aspect_id, sdoc_id=da.sdoc_id)
                    for da in doc_aspects
                ],
            )
        )
        assigned_clusters_arr = np.array(assigned_clusters)

        self._log_status_msg(
            f"Computing cluster embeddings & top documents for {len(cluster_ids_to_update)} clusters."
        )
        cluster_centroids: dict[int, np.ndarray] = {}
        cluster_coordinates: dict[int, np.ndarray] = {}
        top_docs: dict[int, list[int]] = {}
        distance_update_ids: list[
            tuple[int, int]
        ] = []  # List of (sdoc_id, cluster_id) tuples
        distance_update_dtos: list[DocumentClusterUpdate] = []
        for cluster_id in cluster_ids_to_update:
            doc_coordinates = coordinates[assigned_clusters_arr == cluster_id]
            doc_embeddings = embeddings[assigned_clusters_arr == cluster_id]
            sdoc_ids = embedding_sdoc_ids[assigned_clusters_arr == cluster_id]

            # ... compute the cluster embeddings & normalize(cluster centroids)
            cluster_centroids[cluster_id] = np.mean(doc_embeddings, axis=0)
            norm_of_mean = np.linalg.norm(cluster_centroids[cluster_id])
            if norm_of_mean > 0:  # Avoid division by zero
                cluster_centroids[cluster_id] = (
                    cluster_centroids[cluster_id] / norm_of_mean
                )

            # ... compute the cluster coordinates (mean of the 2D coordinates)
            cluster_coordinates[cluster_id] = np.mean(doc_coordinates, axis=0)

            # .. compute the top 3 documents
            similarities = doc_embeddings @ cluster_centroids[cluster_id]
            num_top_docs_to_retrieve = min(3, len(doc_embeddings))
            top_doc_indices = np.argsort(similarities)[:num_top_docs_to_retrieve]
            top_docs[cluster_id] = [sdoc_ids[i].item() for i in top_doc_indices]

            # ... update the distances of the document clusters
            for sdoc_id, similarity in zip(sdoc_ids, similarities):
                distance_update_ids.append((sdoc_id.item(), cluster_id))
                distance_update_dtos.append(
                    DocumentClusterUpdate(similarity=similarity.item())
                )

        self._log_status_msg(
            f"Computed cluster embeddings & top documents for {len(cluster_centroids)} clusters."
        )

        # 8. Store the clusters in the databases ...
        # ... store the cluster embeddings in vector DB
        crud_cluster_embedding.add_embedding_batch(
            client=client,
            project_id=aspect.project_id,
            ids=[
                ClusterObjectIdentifier(
                    aspect_id=aspect.id,
                    cluster_id=cluster_id,
                )
                for cluster_id in cluster_ids_to_update
            ],
            embeddings=[
                cluster_centroids[cluster_id].tolist()
                for cluster_id in cluster_ids_to_update
            ],
        )

        # ... store the clusters in the database
        update_dtos: list[ClusterUpdateIntern] = []
        for cluster_id in cluster_ids_to_update:
            update_dtos.append(
                ClusterUpdateIntern(
                    name=cluster_name[cluster_id],
                    description=cluster_description[cluster_id],
                    top_words=top_words[cluster_id],
                    top_word_scores=top_word_scores[cluster_id],
                    top_docs=top_docs[cluster_id],
                    x=cluster_coordinates[cluster_id][0],
                    y=cluster_coordinates[cluster_id][1],
                )
            )
        crud_cluster.update_multi(
            db=db, ids=cluster_ids_to_update, update_dtos=update_dtos
        )

        # ... update the document clusters with the new distances
        if len(distance_update_dtos) > 0:
            # Update the distances of the document clusters
            crud_document_cluster.update_multi(
                db=db,
                ids=distance_update_ids,
                update_dtos=distance_update_dtos,
            )

        self._log_status_msg(
            f"Updated {len(update_dtos)} clusters in the database with names, descriptions, top words, top word scores, and top documents."
        )

    def create_aspect(
        self,
        db: Session,
        aspect_id: int,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            CreateAspectParams,
        ), "CreateAspectParams expected"

        with self.weaviate.weaviate_session() as client:
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
                client=client,
                aspect_id=aspect_id,
            )

            # 3. Cluster the documents
            self._log_status_step(2)
            self._cluster_documents(
                db=db,
                client=client,
                aspect_id=aspect_id,
                sdoc_ids=None,
                num_clusters=None,
            )

            # 4. Extract the clusters
            self._log_status_step(3)
            self._extract_clusters(
                db=db,
                client=client,
                aspect_id=aspect_id,
                cluster_ids=None,
            )

            self._log_status_msg("Successfully created aspect!")

    def add_missing_docs_to_aspect(
        self,
        db: Session,
        aspect_id: int,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            AddMissingDocsToAspectParams,
        ), "AddMissingDocsToAspectParams expected"

        pass

    def create_cluster_with_name(
        self, db: Session, aspect_id: int, params: PerspectivesJobParams
    ):
        assert isinstance(
            params,
            CreateClusterWithNameParams,
        ), "CreateClusterWithNameParams expected"

        with self.weaviate.weaviate_session() as client:
            # Read the aspect
            aspect = crud_aspect.read(db=db, id=aspect_id)

            # Read the current document <-> cluster assignments
            document_clusters = crud_document_cluster.read_by_aspect_id(
                db=db, aspect_id=aspect.id
            )
            doc2cluster: dict[int, DocumentClusterORM] = {
                dt.sdoc_id: dt for dt in document_clusters
            }
            assert len(document_clusters) == len(doc2cluster), (
                f"There are duplicate document-cluster assignments in the database for aspect {aspect.id}!"
            )

            # 1. Cluster creation
            # - Embedd the new cluster
            self._log_status_step(0)
            self._log_status_msg(
                f"Computing embeddings for the new cluster with model {aspect.embedding_model}..."
            )
            embedding_output = self.prompt_embedder.embed(
                input=PromptEmbedderInput(
                    project_id=aspect.project_id,
                    model_name=aspect.embedding_model,
                    prompt=aspect.doc_embedding_prompt,
                    data=[f"{params.create_dto.name}\n{params.create_dto.description}"],
                ),
            )
            assert len(embedding_output.embeddings) == 1, (
                "Expected exactly one embedding output for the new cluster."
            )

            # - Create the new cluster in the database
            new_cluster = crud_cluster.create(
                db=db,
                create_dto=ClusterCreateIntern(
                    parent_cluster_id=params.create_dto.parent_cluster_id,
                    aspect_id=params.create_dto.aspect_id,
                    level=params.create_dto.level,
                    name=params.create_dto.name,
                    description=params.create_dto.description,
                    is_outlier=False,
                ),
            )

            # 2. Document assignment
            # - For all source documents in the aspect, decide whether to assign the new cluster or not. Track the changes/affected clusters!
            # - Do not reassign documents that are accepted
            self._log_status_step(1)
            update_dtos: list[DocumentClusterUpdate] = []
            update_ids: list[tuple[int, int]] = []
            modified_clusters: set[int] = set()
            results = crud_aspect_embedding.search_near_vector_in_aspect(
                client=client,
                project_id=aspect.project_id,
                aspect_id=aspect.id,
                vector=embedding_output.embeddings[0],
                k=len(document_clusters),
            )
            for result in results:
                doc_cluster = doc2cluster.get(result.id.sdoc_id, None)
                assert doc_cluster is not None, (
                    f"Document {result.id.sdoc_id} does not have a cluster assignment in aspect {aspect.id}."
                )
                if doc_cluster.is_accepted:
                    # skip documents that are already accepted
                    continue

                # assign the new cluster if the similarity is larger than the current cluster's distance
                if result.score > doc_cluster.similarity:
                    update_ids.append((doc_cluster.sdoc_id, doc_cluster.cluster_id))
                    update_dtos.append(
                        DocumentClusterUpdate(
                            cluster_id=new_cluster.id,
                            similarity=result.score,
                        )
                    )
                    # track changes
                    modified_clusters.add(doc_cluster.cluster_id)
                    modified_clusters.add(new_cluster.id)

            # - Store the new cluster assignments in the database
            if len(update_dtos) > 0:
                crud_document_cluster.update_multi(
                    db=db, ids=update_ids, update_dtos=update_dtos
                )
                self._log_status_msg(
                    f"Updated {len(update_dtos)} document-cluster assignments with the new cluster {new_cluster.id}."
                )

            # 3. Cluster Extraction
            # - Extract the clusters for all affected ones (computing top words, top docs, embedding, etc)
            self._log_status_step(2)
            if len(modified_clusters) > 0:
                self._log_status_msg(
                    f"Extracting clusters for {len(modified_clusters)} modified clusters: {modified_clusters}."
                )
                self._extract_clusters(
                    client=client,
                    db=db,
                    aspect_id=aspect.id,
                    cluster_ids=list(modified_clusters),
                )

            self._log_status_msg("Successfully created cluster with name&description!")

    def create_cluster_with_sdocs(
        self, db: Session, aspect_id: int, params: PerspectivesJobParams
    ):
        assert isinstance(
            params,
            CreateClusterWithSdocsParams,
        ), "CreateClusterWithSdocsParams expected"

        # Read the current document <-> cluster assignments
        document_clusters = crud_document_cluster.read_by_aspect_id(
            db=db, aspect_id=aspect_id
        )
        doc2cluster: dict[int, DocumentClusterORM] = {
            dt.sdoc_id: dt for dt in document_clusters
        }
        assert len(document_clusters) == len(doc2cluster), (
            f"There are duplicate document-cluster assignments in the database for aspect {aspect_id}!"
        )

        # 1. Cluster creation
        # - Create the new cluster in the database
        self._log_status_step(0)
        self._log_status_msg("Creating new empty cluster...")
        new_cluster = crud_cluster.create(
            db=db,
            create_dto=ClusterCreateIntern(
                name="New Cluster",
                aspect_id=aspect_id,
                level=0,
                is_outlier=False,
            ),
        )

        # 2. Document assignment
        # - Assign the new cluster to the given source documents
        self._log_status_step(1)
        self._log_status_msg(
            f"Assigning new cluster {new_cluster.id} to {len(params.sdoc_ids)} source documents..."
        )
        # track the changes/affected clusters!
        modified_clusters: set[int] = set(
            [doc2cluster[sdoc_id].cluster_id for sdoc_id in params.sdoc_ids]
        )
        modified_clusters.add(new_cluster.id)
        # assign the new cluster to the source documents
        crud_document_cluster.set_labels2(
            db=db,
            aspect_id=aspect_id,
            cluster_id=new_cluster.id,
            sdoc_ids=params.sdoc_ids,
            is_accepted=True,
        )

        # 3. Cluster Extraction
        # - Extract the clusters for all affected ones (computing top words, top docs, embedding, etc)
        self._log_status_step(2)
        if len(modified_clusters) > 0:
            with self.weaviate.weaviate_session() as client:
                self._log_status_msg(
                    f"Extracting clusters for {len(modified_clusters)} modified clusters: {modified_clusters}."
                )
                self._extract_clusters(
                    db=db,
                    client=client,
                    aspect_id=aspect_id,
                    cluster_ids=list(modified_clusters),
                )

        self._log_status_msg("Successfully created cluster with source documents!")

    def remove_cluster(
        self, db: Session, aspect_id: int, params: PerspectivesJobParams
    ):
        assert isinstance(
            params,
            RemoveClusterParams,
        ), "RemoveClusterParams expected"

        with self.weaviate.weaviate_session() as client:
            # 0. Read all relevant data
            # - Read the cluster to remove
            cluster = crud_cluster.read(db=db, id=params.cluster_id)

            # - Read the aspect
            aspect = cluster.aspect

            # - Read the document aspect embeddings of all affected documents
            doc_aspects = crud_document_aspect.read_by_aspect_and_cluster_id(
                db=db, aspect_id=cluster.aspect_id, cluster_id=cluster.id
            )
            embedding_ids = [
                AspectObjectIdentifier(aspect_id=da.aspect_id, sdoc_id=da.sdoc_id)
                for da in doc_aspects
            ]
            document_embeddings = np.array(
                crud_aspect_embedding.get_embeddings(
                    client=client,
                    project_id=aspect.project_id,
                    ids=embedding_ids,
                )
            )

            # - Read all cluster embeddings, but exclude the cluster to remove
            te_search_result = crud_cluster_embedding.find_embeddings_by_aspect_id(
                client=client,
                project_id=aspect.project_id,
                aspect_id=cluster.aspect_id,
            )
            cluster_embeddings = np.array(
                [
                    te.embedding
                    for te in te_search_result
                    if te.id.cluster_id != cluster.id
                ]
            )
            cluster_ids = [
                te.id.cluster_id
                for te in te_search_result
                if te.id.cluster_id != cluster.id
            ]

            # - Read the current document-cluster assignments (which will be updated)
            document_clusters = crud_document_cluster.read_by_aspect_and_cluster_id(
                db=db, aspect_id=cluster.aspect_id, cluster_id=cluster.id
            )

            assert len(embedding_ids) == len(document_clusters), (
                "The number of document aspect embeddings does not match the number of document clusters."
            )

            # 1. Document Assignment
            # - Compute the similarities of the document embeddings to the remaining cluster embeddings
            self._log_status_step(0)

            similarities = document_embeddings @ cluster_embeddings.T

            # - For each document aspect, find the most similar cluster embedding and update the document cluster assignment
            modified_clusters: set[int] = set()
            sdoc_id2new_cluster_id: dict[int, int] = {}
            sdoc_id2new_cluster_distance: dict[int, float] = {}
            for da, similarity in zip(doc_aspects, similarities):
                most_similar_cluster_index = np.argmax(similarity)
                most_similar_cluster_id = cluster_ids[most_similar_cluster_index]

                sdoc_id2new_cluster_id[da.sdoc_id] = most_similar_cluster_id
                sdoc_id2new_cluster_distance[da.sdoc_id] = similarity[
                    most_similar_cluster_index
                ].item()
                modified_clusters.add(most_similar_cluster_id)

            # - Update the document-cluster assignments in the database
            update_dtos: list[DocumentClusterUpdate] = []
            update_ids: list[tuple[int, int]] = []
            for dt in document_clusters:
                update_dtos.append(
                    DocumentClusterUpdate(
                        cluster_id=sdoc_id2new_cluster_id[dt.sdoc_id],
                        similarity=sdoc_id2new_cluster_distance[dt.sdoc_id],
                        is_accepted=False,  # Reset acceptance status
                    )
                )
                update_ids.append((dt.sdoc_id, dt.cluster_id))

            if len(update_dtos) > 0:
                crud_document_cluster.update_multi(
                    db=db, ids=update_ids, update_dtos=update_dtos
                )
                self._log_status_msg(
                    f"Updated {len(update_dtos)} document-cluster assignments to the most similar clusters."
                )

            # 2. Cluster Removal: Remove the cluster from the database
            self._log_status_step(1)
            crud_cluster.delete(db=db, id=params.cluster_id)
            crud_cluster_embedding.remove_embedding(
                client=client,
                project_id=aspect.project_id,
                id=ClusterObjectIdentifier(
                    aspect_id=aspect.id,
                    cluster_id=params.cluster_id,
                ),
            )

            # 3. Cluster Extraction: Extract the clusters for all affected ones (computing top words, top docs, embedding, etc)
            self._log_status_step(2)
            if len(modified_clusters) > 0:
                self._log_status_msg(
                    f"Extracting clusters for {len(modified_clusters)} modified clusters: {modified_clusters}."
                )
                self._extract_clusters(
                    db=db,
                    client=client,
                    aspect_id=aspect.id,
                    cluster_ids=list(modified_clusters),
                )

            self._log_status_msg("Successfully removed cluster!")

    def merge_clusters(
        self, db: Session, aspect_id: int, params: PerspectivesJobParams
    ):
        assert isinstance(
            params,
            MergeClustersParams,
        ), "MergeClustersParams expected"

        with self.weaviate.weaviate_session() as client:
            # 0. Read the clusters to merge
            cluster1 = crud_cluster.read(db=db, id=params.cluster_to_keep)
            cluster2 = crud_cluster.read(db=db, id=params.cluster_to_merge)
            aspect = cluster1.aspect
            assert cluster1.aspect_id == cluster2.aspect_id, (
                "Cannot merge clusters from different aspects."
            )

            # 1. Merge the clusters (updating the cluster id)
            self._log_status_step(0)
            crud_document_cluster.merge_clusters(
                db=db,
                cluster_to_keep=params.cluster_to_keep,
                cluster_to_merge=params.cluster_to_merge,
            )

            # 2. Delete the merged cluster from the database
            self._log_status_step(1)
            crud_cluster.delete(db=db, id=params.cluster_to_merge)
            crud_cluster_embedding.remove_embedding(
                client=client,
                project_id=aspect.project_id,
                id=ClusterObjectIdentifier(
                    aspect_id=aspect.id,
                    cluster_id=params.cluster_to_merge,
                ),
            )
            self._log_status_msg(
                f"Merged clusters {params.cluster_to_keep} and {params.cluster_to_merge}."
            )

            # 3. Extract the clusters for the remaining cluster (computing top words, top docs, embedding, etc)
            self._log_status_step(2)
            self._extract_clusters(
                db=db,
                client=client,
                aspect_id=aspect.id,
                cluster_ids=[params.cluster_to_keep],
            )

            self._log_status_msg("Successfully merged clusters!")

    def split_cluster(self, db: Session, aspect_id: int, params: PerspectivesJobParams):
        assert isinstance(
            params,
            SplitClusterParams,
        ), "SplitClusterParams expected"

        with self.weaviate.weaviate_session() as client:
            # 0. Read the cluster to split
            cluster = crud_cluster.read(db=db, id=params.cluster_id)
            aspect = cluster.aspect

            # 0. Find all sdoc_ids associated with the cluster
            sdoc_ids = [
                da.sdoc_id
                for da in crud_document_aspect.read_by_aspect_and_cluster_id(
                    db=db, aspect_id=cluster.aspect_id, cluster_id=cluster.id
                )
            ]
            assert len(sdoc_ids) > 0, "Cannot split a cluster without document aspects."
            self._log_status_msg(
                f"Found {len(sdoc_ids)} source documents associated with cluster {params.cluster_id}."
            )

            # 1. Remove the cluster from the database
            self._log_status_step(0)
            crud_cluster.delete(db=db, id=params.cluster_id)
            crud_cluster_embedding.remove_embedding(
                client=client,
                project_id=aspect.project_id,
                id=ClusterObjectIdentifier(
                    aspect_id=aspect.id,
                    cluster_id=params.cluster_id,
                ),
            )
            self._log_status_msg(
                f"Removed cluster {params.cluster_id} from the database."
            )

            # 2. Cluster the documents, creating new clusters and assigning them to the documents
            self._log_status_step(1)
            created_cluster_ids = self._cluster_documents(
                db=db,
                client=client,
                aspect_id=aspect.id,
                sdoc_ids=sdoc_ids,  # TODO: could be optimized by providing the document aspects directly
                num_clusters=None,
            )

            # 3. Extract the clusters
            self._log_status_step(2)
            self._extract_clusters(
                db=db,
                client=client,
                aspect_id=aspect.id,
                cluster_ids=created_cluster_ids,
            )

            self._log_status_msg("Successfully split cluster!")

    def change_cluster(
        self, db: Session, aspect_id: int, params: PerspectivesJobParams
    ):
        assert isinstance(
            params,
            ChangeClusterParams,
        ), "ChangeClusterParams expected"

        # 0. Read the cluster to change to
        if params.cluster_id == -1:
            cluster = crud_cluster.read_or_create_outlier_cluster(
                db=db, aspect_id=aspect_id, level=0
            )
            cluster_id = cluster.id
            logger.info(f"Changing to outlier cluster {cluster.name}.")
        else:
            cluster = crud_cluster.read(db=db, id=params.cluster_id)
            cluster_id = cluster.id
            logger.info(f"Changing to normal cluster {cluster.name}.")

        # Read the current document <-> cluster assignments
        document_clusters = crud_document_cluster.read_by_aspect_id(
            db=db, aspect_id=aspect_id
        )
        doc2cluster: dict[int, DocumentClusterORM] = {
            dt.sdoc_id: dt for dt in document_clusters
        }

        # 1. Document assignment
        # - Assign the new cluster to the given source documents
        self._log_status_step(0)
        self._log_status_msg(
            f"Assigning the cluster '{cluster.name}' to {len(params.sdoc_ids)} documents..."
        )
        # track the changes/affected clusters!
        modified_clusters: set[int] = set(
            [doc2cluster[sdoc_id].cluster_id for sdoc_id in params.sdoc_ids]
        )
        modified_clusters.add(cluster_id)
        # assign the cluster to the source documents
        crud_document_cluster.set_labels2(
            db=db,
            aspect_id=aspect_id,
            cluster_id=cluster.id,
            sdoc_ids=params.sdoc_ids,
            is_accepted=True,
        )

        # 2. Cluster Extraction
        # - Extract the clusters for all affected ones (computing top words, top docs, embedding, etc)
        self._log_status_step(1)
        if len(modified_clusters) > 0:
            with self.weaviate.weaviate_session() as client:
                self._log_status_msg(
                    f"Extracting clusters for {len(modified_clusters)} modified clusters: {modified_clusters}."
                )
                self._extract_clusters(
                    db=db,
                    client=client,
                    aspect_id=aspect_id,
                    cluster_ids=list(modified_clusters),
                )

        self._log_status_msg("Successfully changed cluster!")

    def __build_training_data(
        self,
        db: Session,
        aspect_id: int,
    ) -> tuple[list[str], list[str], list[int]]:
        # Read the aspect
        aspect = crud_aspect.read(db=db, id=aspect_id)

        # Read all clusters
        all_clusters = crud_cluster.read_by_aspect_and_level(
            db=db, aspect_id=aspect.id, level=0
        )
        cluster2accepted_docs: dict[int, list[int]] = {t.id: [] for t in all_clusters}

        # Read the document aspects
        doc_aspects = aspect.document_aspects
        sdoc_id2doc_aspect: dict[int, DocumentAspectORM] = {
            da.sdoc_id: da for da in doc_aspects
        }

        # Read the current document <-> cluster assignments
        document_clusters = crud_document_cluster.read_by_aspect_id(
            db=db, aspect_id=aspect.id
        )
        for dt in document_clusters:
            if dt.is_accepted:
                cluster2accepted_docs[dt.cluster_id].append(dt.sdoc_id)

        # Build training_data
        train_labels: list[str] = []
        train_docs: list[str] = []
        train_doc_ids: list[int] = []
        for cluster in all_clusters:
            if cluster.is_outlier:
                continue

            accepted_sdoc_ids = cluster2accepted_docs[cluster.id]
            if len(accepted_sdoc_ids) == 0:
                # If there are no accepted documents, use the top documents
                assert cluster.top_docs is not None, (
                    f"Cluster {cluster.id} has no accepted documents, but top_docs is not None."
                )
                accepted_sdoc_ids = cluster.top_docs

            for sdoc_id in accepted_sdoc_ids:
                da = sdoc_id2doc_aspect[sdoc_id]
                train_docs.append(da.content)
                train_labels.append(f"{cluster.id}")
                train_doc_ids.append(da.sdoc_id)

        return train_docs, train_labels, train_doc_ids

    def refine_cluster_model(
        self, db: Session, aspect_id: int, params: PerspectivesJobParams
    ):
        assert isinstance(
            params,
            RefineModelParams,
        ), "RefineModelParams expected"

        with self.weaviate.weaviate_session() as client:
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
                f"Refining cluster model for aspect {aspect_id} with model {model_name}."
            )
            self._embed_documents(
                db=db,
                client=client,
                aspect_id=aspect_id,
                train_docs=train_docs,
                train_labels=train_labels,
            )

            # 3. Cluster the documents
            self._log_status_step(2)
            self._cluster_documents(
                db=db,
                client=client,
                aspect_id=aspect_id,
                sdoc_ids=None,
                num_clusters=None,
                train_doc_ids=train_doc_ids,
                train_cluster_ids=[int(tl) for tl in train_labels],
            )

            # 4. Extract the clusters
            self._log_status_step(3)
            self._extract_clusters(
                db=db,
                client=client,
                aspect_id=aspect_id,
                cluster_ids=None,
            )

            self._log_status_msg("Successfully refined map!")

    def reset_cluster_model(
        self, db: Session, aspect_id: int, params: PerspectivesJobParams
    ):
        assert isinstance(
            params,
            ResetModelParams,
        ), "ResetModelParams expected"

        pass
