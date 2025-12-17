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

from common.doc_type import DocType
from core.doc.source_document_dto import SourceDocumentRead
from modules.perspectives.aspect.aspect_dto import AspectRead, AspectUpdateIntern
from modules.perspectives.aspect.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.aspect.aspect_embedding_dto import AspectObjectIdentifier
from modules.perspectives.cluster.cluster_dto import (
    ClusterCreateIntern,
    ClusterUpdateIntern,
)
from modules.perspectives.cluster.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.ctfidf import ClassTfidfTransformer
from modules.perspectives.document_aspect.document_aspect_dto import (
    DocumentAspectCreate,
    DocumentAspectUpdate,
)
from modules.perspectives.document_aspect.document_aspect_orm import DocumentAspectORM
from modules.perspectives.document_cluster.document_cluster_dto import (
    DocumentClusterCreate,
    DocumentClusterUpdate,
)
from modules.perspectives.document_cluster.document_cluster_orm import (
    DocumentClusterORM,
)
from modules.perspectives.perspectives_db_transaction import PerspectivesDBTransaction
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
    RecomputeClusterTitleAndDescriptionParams,
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
from repos.llm_repo import LLMMessage, LLMRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import Job

BATCH_SIZE = 32


class PerspectivesJobHandler:
    def __init__(self, job: Job):
        self.job = job

        self.llm: LLMRepo = LLMRepo()
        self.weaviate: WeaviateRepo = WeaviateRepo()
        self.fsr: FilesystemRepo = FilesystemRepo()

        # TODO: use device from job?
        self.prompt_embedder = PromptEmbedder(device="cuda:0")

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
            PerspectivesJobType.RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION: [
                "Retrieve Top Words",
                "Compute Title and Description",
            ],
        }
        self.method_for_job_type: dict[
            PerspectivesJobType,
            Callable[[PerspectivesDBTransaction, PerspectivesJobParams], None],
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
            PerspectivesJobType.RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION: self.recompute_cluster_title_and_description,
        }

    def handle_perspectives_job(self, db: Session, payload: PerspectivesJobInput):
        # Set initial status
        self.job.update(
            current_step=0,
            status_message="Waiting...",
            steps=self.perspectives_job_steps.get(payload.perspectives_job_type, []),
        )

        with self.weaviate.weaviate_session() as client:
            transaction = PerspectivesDBTransaction(
                db=db,
                client=client,
                aspect_id=payload.aspect_id,
                perspective_action=payload.perspectives_job_type,
                # we do not write history for aspect creation, it cannot be undone or redone!
                write_history=payload.perspectives_job_type
                != PerspectivesJobType.CREATE_ASPECT,
            )

            try:
                # Execute the correct function
                self.method_for_job_type[payload.perspectives_job_type](
                    transaction, payload.parameters
                )

                transaction.commit()
            except Exception as e:
                transaction.rollback()
                self._log_status_msg(
                    f"{payload.perspectives_job_type} failed with error: {str(e)}"
                )
                raise e

    def _log_status_msg(self, status_msg: str):
        self.job.update(status_message=status_msg)
        logger.info(status_msg)

    def _log_status_step(self, step: int):
        self.job.update(current_step=step)

    def _modify_documents(self, transaction: PerspectivesDBTransaction, aspect_id: int):
        aspect = transaction.read_aspect(id=aspect_id)
        aspect_dto = AspectRead.model_validate(aspect)

        # 1. Find all source documents relevant for this aspect
        sdoc_datas = [
            (data.id, data.content)
            for data in transaction.read_sdoc_data_by_doctype_and_tag(
                project_id=aspect_dto.project_id,
                doctype=aspect_dto.modality,
                tag_id=aspect_dto.tag_id,
            )
        ]
        self._log_status_msg(
            f"Found {len(sdoc_datas)} source documents without an aspect. Modifying them..."
        )

        # 2. Modify the documents
        class LLMResponse(BaseModel):
            content: str

        create_dtos: list[DocumentAspectCreate] = []
        # if prompt is provided, use LLM to generate a modified document
        if aspect_dto.modality == DocType.text and aspect_dto.doc_modification_prompt:
            num_batches = (len(sdoc_datas) + BATCH_SIZE - 1) // BATCH_SIZE
            for i in range(0, len(sdoc_datas), BATCH_SIZE):
                self._log_status_msg(
                    f"Modifying documents with LLM! Processing batch ({i + 1} / {num_batches})..."
                )
                sdata = sdoc_datas[i : i + BATCH_SIZE]

                # 2.1 prepare batch messages
                batch_messages: list[LLMMessage] = []
                for sdoc_data in sdata:
                    sdoc_id, sdoc_content = sdoc_data
                    batch_messages.append(
                        LLMMessage(
                            system_prompt="You are a document modification assistant.",
                            user_prompt=aspect_dto.doc_modification_prompt
                            + f"\n\nOriginal document:\n{sdoc_content}",
                        )
                    )

                # 2.2 prompt the model (batchwise)
                responses = self.llm.llm_batch_chat(
                    messages=batch_messages,
                    response_model=LLMResponse,
                )

                # 2.3 store the results
                for response, (sdoc_id, sdoc_content) in zip(responses, sdata):
                    create_dtos.append(
                        DocumentAspectCreate(
                            aspect_id=aspect_dto.id,
                            sdoc_id=sdoc_id,
                            content=response.content,
                        )
                    )
        else:
            # if no prompt is provided or modality is not text, use the original document
            self._log_status_msg(
                f"No prompt provided or modality is not text. Using the original document for {len(sdoc_datas)} source documents."
            )

            create_dtos.extend(
                [
                    DocumentAspectCreate(
                        aspect_id=aspect_dto.id,
                        sdoc_id=sdoc_id,
                        content=sdoc_content,
                    )
                    for sdoc_id, sdoc_content in sdoc_datas
                ]
            )

        transaction.create_document_aspects(create_dtos=create_dtos)
        self._log_status_msg(
            f"Modified {len(create_dtos)} source documents and created DocumentAspects."
        )

    def __compute_embeddings_and_coordinates(
        self,
        project_id: int,
        aspect_id: int,
        modality: DocType,
        embedding_model: str,
        embedding_prompt: str,
        document_data: list[str],
        train_docs: list[str] | None = None,
        train_labels: list[str] | None = None,
    ) -> tuple[list[list[float]], list[tuple[float, float]]]:
        assert len(document_data) > 0, "No document data provided."

        # 1. Embed the document aspects
        self._log_status_msg(
            f"Computing embeddings for {len(document_data)} document aspects with model {embedding_model}..."
        )
        embedding_output = self.prompt_embedder.embed(
            input=PromptEmbedderInput(
                project_id=project_id,
                model_name=embedding_model,
                prompt=embedding_prompt,
                modality=modality,
                data=document_data,
                train_docs=train_docs,
                train_labels=train_labels,
            ),
        )
        assert len(embedding_output.embeddings) == len(document_data), (
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
                f"Fitting a new UMAP model for {len(document_data)} document aspects..."
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
            f"Computing 2D coordinates for {len(document_data)} document aspects using the UMAP model..."
        )
        coords = reducer.transform(embeddings).tolist()
        self._log_status_msg(
            f"Computed 2D coordinates for {len(document_data)} document aspects."
        )

        return embedding_output.embeddings, coords

    def __generate_map_thumbnail(
        self,
        transaction: PerspectivesDBTransaction,
        aspect_id: int,
    ) -> None:
        # Read all relevant data
        aspect = transaction.read_aspect(id=aspect_id)
        doc_aspects = aspect.document_aspects
        doc_clusters = transaction.read_document_clusters_by_aspect(aspect_id=aspect_id)
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
        transaction: PerspectivesDBTransaction,
        aspect_id: int,
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
        aspect = transaction.read_aspect(id=aspect_id)
        aspect_dto = AspectRead.model_validate(aspect)
        doc_aspects = aspect.document_aspects

        match aspect_dto.modality:
            case DocType.text:
                document_data = [da.content for da in doc_aspects]
            case DocType.image:
                sdocs = transaction.read_sdoc_by_ids(
                    ids=[da.sdoc_id for da in doc_aspects]
                )
                sdoc_reads = [SourceDocumentRead.model_validate(sdoc) for sdoc in sdocs]
                document_data = [
                    str(
                        self.fsr.get_path_to_sdoc_file(
                            sdoc_read, raise_if_not_exists=True
                        )
                    )
                    for sdoc_read in sdoc_reads
                ]
            case _:
                raise ValueError(f"Unsupported modality: {aspect_dto.modality}")

        # 2. Compute embedding & coordinates, then store them in the DB
        if len(document_data) > 0:
            self._log_status_msg(
                f"Embedding {len(document_data)} document aspects for aspect {aspect_id}..."
            )
            embeddings, coords = self.__compute_embeddings_and_coordinates(
                project_id=aspect.project_id,
                aspect_id=aspect.id,
                embedding_model=aspect.embedding_model,
                embedding_prompt=aspect.doc_embedding_prompt,
                document_data=document_data,
                modality=aspect_dto.modality,
                train_docs=train_docs,
                train_labels=train_labels,
            )

            # Store embeddings in the vector DB
            transaction.store_document_aspect_embeddings(
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
            transaction.update_document_aspects(
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
        transaction: PerspectivesDBTransaction,
        aspect_id: int,
        sdoc_ids: list[int] | None,
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

        aspect = transaction.read_aspect(id=aspect_id)
        aspect_dto = AspectRead.model_validate(aspect)

        # 1. Read the document aspects
        doc_aspects = aspect.document_aspects
        if sdoc_ids:
            sdoc_id2_doc_aspect = {da.sdoc_id: da for da in doc_aspects}
            doc_aspects = [
                sdoc_id2_doc_aspect[sdoc_id]
                for sdoc_id in sdoc_ids
                if sdoc_id in sdoc_id2_doc_aspect
            ]

        # ... and their embeddings
        embeddings = np.array(
            transaction.read_document_aspect_embeddings(
                project_id=aspect.project_id,
                aspect_object_identifiers=[
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
            n_neighbors=aspect_dto.pipeline_settings.umap_n_neighbors,
            n_components=aspect_dto.pipeline_settings.umap_n_components,
            metric=aspect_dto.pipeline_settings.umap_metric,
            min_dist=aspect_dto.pipeline_settings.umap_min_dist,
            low_memory=False,
        )
        reduced_embeddings = np.array(reducer.fit_transform(embeddings))
        self._log_status_msg(
            f"Reduced the dimensionality of the embeddings from {embeddings.shape} to {reduced_embeddings.shape}."
        )

        # 3. Cluster the reduced embeddings
        self._log_status_msg("Clustering the reduced embeddings with HDBSCAN...")
        hdbscan_model = HDBSCAN(
            min_cluster_size=aspect_dto.pipeline_settings.hdbscan_min_cluster_size,
            metric=aspect_dto.pipeline_settings.hdbscan_metric,
        )
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
            outlier_cluster = transaction.read_or_create_outlier_cluster(
                aspect_id=aspect_id
            )
            hdb_cluster_id2db_cluster_id[-1] = (
                outlier_cluster.id
            )  # -1 is the outlier cluster ID
            self._log_status_msg(
                f"Computed a mapping from {len(hdb_cluster_id2db_cluster_id)} clusters to existing clusters."
            )

            # Construct update DTOS
            doc_clusters = transaction.read_document_clusters_by_aspect(
                aspect_id=aspect_id
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
            transaction.update_document_clusters(
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
                outlier_cluster = transaction.read_or_create_outlier_cluster(
                    aspect_id=aspect_id
                )
                hdb_cluster_ids.remove(-1)
                hdb_cluster_id2db_cluster_id[-1] = outlier_cluster.id

            db_clusters = transaction.create_clusters(
                create_dtos=[
                    ClusterCreateIntern(
                        aspect_id=aspect_id,
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
            transaction.create_document_clusters(
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
            transaction=transaction,
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
        num_words: int,
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
        k = num_words
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

    def __generate_cluster_title_and_description(
        self,
        top_words: dict[int, list[str]],
        cluster_ids: list[int],
    ) -> tuple[dict[int, str], dict[int, str]]:
        """
        Generates cluster titles and descriptions using an LLM based on the provided top words.
        :param top_words: A dictionary mapping cluster IDs to their top words.
        :param cluster_ids: A list of cluster IDs for which to generate titles and descriptions.
        :return: Two dictionaries mapping cluster IDs to their generated titles and descriptions.
        """

        class LLMResponse(BaseModel):
            description: str
            title: str

        cluster_name: dict[int, str] = {}
        cluster_description: dict[int, str] = {}
        self._log_status_msg("Generating cluster names and descriptions with LLM...")

        # 1. prepare batch messages
        batch_messages: list[LLMMessage] = []
        for cluster_id in cluster_ids:
            tw = top_words[cluster_id]
            batch_messages.append(
                LLMMessage(
                    system_prompt="You are a cluster name and description generator.",
                    user_prompt=f"Generate a name and description for the cluster with the following words: {', '.join(tw)}",
                )
            )

        # 2. prompt the model (batch)
        responses = self.llm.llm_batch_chat(
            messages=batch_messages,
            response_model=LLMResponse,
        )

        # 3. store the results
        for response, cluster_id in zip(responses, cluster_ids):
            cluster_name[cluster_id] = response.title
            cluster_description[cluster_id] = response.description

        return cluster_name, cluster_description

    def _extract_clusters(
        self,
        transaction: PerspectivesDBTransaction,
        aspect_id: int,
        cluster_ids: list[int] | None,
        skip_name_generation_ids: list[int] | None = None,
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

        aspect = transaction.read_aspect(id=aspect_id)
        aspect_dto = AspectRead.model_validate(aspect)

        # 0. Read all required data
        # - Read the clusters
        all_clusters = aspect.clusters

        # - Read all document aspects
        doc_aspects = aspect.document_aspects
        doc_aspects.sort(key=lambda da: da.sdoc_id)  # Sort by source document ID

        # - Read all document cluster assignments
        doc_cluster_assignments = transaction.read_document_clusters_by_aspect(
            aspect_id=aspect_id
        )
        doc_cluster_assignments.sort(
            key=lambda dt: dt.sdoc_id
        )  # Sort by source document ID

        assigned_clusters: list[int] = []
        assert len(doc_aspects) == len(doc_cluster_assignments), (
            "The number of aspects and cluster assignments does not match."
        )
        for da, dc in zip(doc_aspects, doc_cluster_assignments):
            if da.sdoc_id != dc.sdoc_id:
                raise ValueError(
                    f"DocumentAspect and DocumentCluster do not match: {da.sdoc_id} != {dc.sdoc_id}"
                )
            assigned_clusters.append(dc.cluster_id)

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
            num_words=aspect_dto.pipeline_settings.num_keywords,
            all_cluster_ids=[c.id for c in all_clusters],
            doc_aspects=doc_aspects,
            assigned_clusters=assigned_clusters,
        )

        # 2. Generate cluster name and description with LLM

        # determine which clusters to update: we skip user edited clusters and clusters that are in the skip list
        ids_to_generate_names_for = []
        cluster_id2is_user_edited = {c.id: c.is_user_edited for c in all_clusters}
        skip_ids = set(skip_name_generation_ids or [])
        for cid in cluster_ids_to_update:
            if cid in skip_ids:
                continue
            if cluster_id2is_user_edited.get(cid, False):
                continue
            ids_to_generate_names_for.append(cid)

        cluster_name, cluster_description = (
            self.__generate_cluster_title_and_description(
                top_words=top_words, cluster_ids=ids_to_generate_names_for
            )
        )

        # 3. Based on embeddings...
        coordinates = np.array([[da.x, da.y] for da in doc_aspects])
        embedding_sdoc_ids = np.array([da.sdoc_id for da in doc_aspects])
        embeddings = np.array(
            transaction.read_document_aspect_embeddings(
                project_id=aspect.project_id,
                aspect_object_identifiers=[
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

            # .. compute the top documents
            similarities = doc_embeddings @ cluster_centroids[cluster_id]
            num_top_docs_to_retrieve = min(
                aspect_dto.pipeline_settings.num_top_documents, len(doc_embeddings)
            )
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

        # 4. Store the clusters in the databases ...
        # ... store the cluster embeddings in vector DB
        transaction.store_cluster_embeddings(
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
            update_dto = ClusterUpdateIntern(
                top_words=top_words[cluster_id],
                top_word_scores=top_word_scores[cluster_id],
                top_docs=top_docs[cluster_id],
                x=cluster_coordinates[cluster_id][0],
                y=cluster_coordinates[cluster_id][1],
            )
            if cluster_id in cluster_name:
                update_dto.name = cluster_name[cluster_id]

            if cluster_id in cluster_description:
                update_dto.description = cluster_description[cluster_id]

            update_dtos.append(update_dto)
        transaction.update_clusters(ids=cluster_ids_to_update, update_dtos=update_dtos)

        # ... update the document clusters with the new distances
        if len(distance_update_dtos) > 0:
            # Update the distances of the document clusters
            transaction.update_document_clusters(
                ids=distance_update_ids,
                update_dtos=distance_update_dtos,
            )

        self._log_status_msg(
            f"Updated {len(update_dtos)} clusters in the database with names, descriptions, top words, top word scores, and top documents."
        )

    def create_aspect(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            CreateAspectParams,
        ), "CreateAspectParams expected"

        # 1. Modify the documents based on the prompt
        self._log_status_step(0)
        self._modify_documents(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
        )

        # 2. Embedd the documents based on the prompt
        self._log_status_step(1)
        self._embed_documents(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
        )

        # 3. Cluster the documents
        self._log_status_step(2)
        self._cluster_documents(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
            sdoc_ids=None,
        )

        # 4. Extract the clusters
        self._log_status_step(3)
        self._extract_clusters(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
            cluster_ids=None,
        )
        self._log_status_msg("Successfully created aspect!")

    def add_missing_docs_to_aspect(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            AddMissingDocsToAspectParams,
        ), "AddMissingDocsToAspectParams expected"

        pass

    def create_cluster_with_name(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            CreateClusterWithNameParams,
        ), "CreateClusterWithNameParams expected"

        # Read the aspect
        aspect = transaction.read_aspect(id=transaction.aspect_id)
        aspect_dto = AspectRead.model_validate(aspect)

        # Read the current document <-> cluster assignments
        document_clusters = transaction.read_document_clusters_by_aspect(
            aspect_id=aspect.id
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
                modality=aspect_dto.modality,
                data=[f"{params.create_dto.name}\n{params.create_dto.description}"],
            ),
        )
        assert len(embedding_output.embeddings) == 1, (
            "Expected exactly one embedding output for the new cluster."
        )

        # - Create the new cluster in the database
        new_clusters = transaction.create_clusters(
            create_dtos=[
                ClusterCreateIntern(
                    aspect_id=params.create_dto.aspect_id,
                    name=params.create_dto.name,
                    description=params.create_dto.description,
                    is_outlier=False,
                )
            ],
        )
        new_cluster = new_clusters[0]

        # 2. Document assignment
        # - For all source documents in the aspect, decide whether to assign the new cluster or not. Track the changes/affected clusters!
        # - Do not reassign documents that are accepted
        self._log_status_step(1)
        update_dtos: list[DocumentClusterUpdate] = []
        update_ids: list[tuple[int, int]] = []
        modified_clusters: set[int] = set()
        results = crud_aspect_embedding.search_near_vector_in_aspect(
            client=transaction.client,
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
            transaction.update_document_clusters(
                ids=update_ids, update_dtos=update_dtos
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
                transaction=transaction,
                aspect_id=aspect.id,
                cluster_ids=list(modified_clusters),
                skip_name_generation_ids=[new_cluster.id],
            )

        self._log_status_msg("Successfully created cluster with name&description!")

    def create_cluster_with_sdocs(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            CreateClusterWithSdocsParams,
        ), "CreateClusterWithSdocsParams expected"

        # Read the current document <-> cluster assignments
        document_clusters = transaction.read_document_clusters_by_aspect(
            aspect_id=transaction.aspect_id
        )
        doc2cluster: dict[int, DocumentClusterORM] = {
            dt.sdoc_id: dt for dt in document_clusters
        }
        assert len(document_clusters) == len(doc2cluster), (
            f"There are duplicate document-cluster assignments in the database for aspect {transaction.aspect_id}!"
        )

        # 1. Cluster creation
        # - Create the new cluster in the database
        self._log_status_step(0)
        self._log_status_msg("Creating new empty cluster...")
        new_clusters = transaction.create_clusters(
            create_dtos=[
                ClusterCreateIntern(
                    name="New Cluster",
                    aspect_id=transaction.aspect_id,
                    is_outlier=False,
                )
            ],
        )
        new_cluster = new_clusters[0]

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
        transaction.update_document_clusters(
            ids=[
                (sdoc_id, doc2cluster[sdoc_id].cluster_id)
                for sdoc_id in params.sdoc_ids
            ],
            update_dtos=[
                DocumentClusterUpdate(cluster_id=new_cluster.id, is_accepted=True)
                for sdoc_id in params.sdoc_ids
            ],
        )

        # 3. Cluster Extraction
        # - Extract the clusters for all affected ones (computing top words, top docs, embedding, etc)
        self._log_status_step(2)
        if len(modified_clusters) > 0:
            self._log_status_msg(
                f"Extracting clusters for {len(modified_clusters)} modified clusters: {modified_clusters}."
            )
            self._extract_clusters(
                transaction=transaction,
                aspect_id=transaction.aspect_id,
                cluster_ids=list(modified_clusters),
            )

        self._log_status_msg("Successfully created cluster with source documents!")

    def remove_cluster(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            RemoveClusterParams,
        ), "RemoveClusterParams expected"

        # 0. Read all relevant data
        # - Read the cluster to remove
        cluster = transaction.read_cluster(id=params.cluster_id)

        # - Read the aspect
        aspect = cluster.aspect

        # - Read the document aspect embeddings of all affected documents
        doc_aspects = transaction.read_document_aspects_by_aspect_and_cluster(
            aspect_id=cluster.aspect_id, cluster_id=cluster.id
        )
        embedding_ids = [
            AspectObjectIdentifier(aspect_id=da.aspect_id, sdoc_id=da.sdoc_id)
            for da in doc_aspects
        ]
        document_embeddings = np.array(
            transaction.read_document_aspect_embeddings(
                project_id=aspect.project_id,
                aspect_object_identifiers=embedding_ids,
            )
        )

        # - Read all cluster embeddings, but exclude the cluster to remove
        te_search_result = transaction.read_cluster_embeddings_by_aspect(
            project_id=aspect.project_id,
            aspect_id=cluster.aspect_id,
        )
        cluster_embeddings = np.array(
            [te.embedding for te in te_search_result if te.id.cluster_id != cluster.id]
        )
        cluster_ids = [
            te.id.cluster_id
            for te in te_search_result
            if te.id.cluster_id != cluster.id
        ]

        # - Read the current document-cluster assignments (which will be updated)
        document_clusters = transaction.read_document_clusters_by_cluster(
            cluster_id=cluster.id
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
            transaction.update_document_clusters(
                ids=update_ids, update_dtos=update_dtos
            )
            self._log_status_msg(
                f"Updated {len(update_dtos)} document-cluster assignments to the most similar clusters."
            )

        # 2. Cluster Removal: Remove the cluster from the database
        self._log_status_step(1)
        transaction.delete_clusters(cluster_ids=[params.cluster_id])
        transaction.remove_cluster_embeddings(
            project_id=aspect.project_id,
            ids=[
                ClusterObjectIdentifier(
                    aspect_id=aspect.id, cluster_id=params.cluster_id
                )
            ],
        )

        # 3. Cluster Extraction: Extract the clusters for all affected ones (computing top words, top docs, embedding, etc)
        self._log_status_step(2)
        if len(modified_clusters) > 0:
            self._log_status_msg(
                f"Extracting clusters for {len(modified_clusters)} modified clusters: {modified_clusters}."
            )
            self._extract_clusters(
                transaction=transaction,
                aspect_id=aspect.id,
                cluster_ids=list(modified_clusters),
            )

        self._log_status_msg("Successfully removed cluster!")

    def merge_clusters(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            MergeClustersParams,
        ), "MergeClustersParams expected"

        # 0. Read the clusters to merge
        cluster1 = transaction.read_cluster(id=params.cluster_to_keep)
        cluster2 = transaction.read_cluster(id=params.cluster_to_merge)
        aspect = cluster1.aspect
        assert cluster1.aspect_id == cluster2.aspect_id, (
            "Cannot merge clusters from different aspects."
        )

        # 1. Merge the clusters (we update all document cluster assignments from cluster2 to cluster1)
        self._log_status_step(0)
        transaction.update_document_clusters(
            ids=[(dt.sdoc_id, dt.cluster_id) for dt in cluster2.document_clusters],
            update_dtos=[
                DocumentClusterUpdate(cluster_id=cluster1.id)
                for _ in cluster2.document_clusters
            ],
        )

        # 2. Delete the merged cluster from the database
        self._log_status_step(1)
        transaction.delete_clusters(cluster_ids=[params.cluster_to_merge])
        transaction.remove_cluster_embeddings(
            project_id=aspect.project_id,
            ids=[
                ClusterObjectIdentifier(
                    aspect_id=aspect.id, cluster_id=params.cluster_to_merge
                )
            ],
        )
        self._log_status_msg(
            f"Merged clusters {params.cluster_to_keep} and {params.cluster_to_merge}."
        )

        # 3. Extract the clusters for the remaining cluster (computing top words, top docs, embedding, etc)
        self._log_status_step(2)
        self._extract_clusters(
            transaction=transaction,
            aspect_id=aspect.id,
            cluster_ids=[params.cluster_to_keep],
        )

        self._log_status_msg("Successfully merged clusters!")

    def split_cluster(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            SplitClusterParams,
        ), "SplitClusterParams expected"

        # 0. Read the cluster to split
        cluster = transaction.read_cluster(id=params.cluster_id)
        aspect = cluster.aspect

        # 0. Find all sdoc_ids associated with the cluster
        sdoc_ids = [dc.sdoc_id for dc in cluster.document_clusters]
        assert len(sdoc_ids) > 0, "Cannot split a cluster without documents."
        self._log_status_msg(
            f"Found {len(sdoc_ids)} source documents associated with cluster {params.cluster_id}."
        )

        # 1. Remove the cluster from the database
        self._log_status_step(0)
        transaction.delete_clusters(cluster_ids=[params.cluster_id])
        transaction.remove_cluster_embeddings(
            project_id=aspect.project_id,
            ids=[
                ClusterObjectIdentifier(
                    aspect_id=aspect.id, cluster_id=params.cluster_id
                )
            ],
        )
        self._log_status_msg(f"Removed cluster {params.cluster_id} from the database.")

        # 2. Cluster the documents, creating new clusters and assigning them to the documents
        self._log_status_step(1)
        created_cluster_ids = self._cluster_documents(
            transaction=transaction,
            aspect_id=aspect.id,
            sdoc_ids=sdoc_ids,  # TODO: could be optimized by providing the document aspects directly
        )

        # 3. Extract the clusters
        self._log_status_step(2)
        self._extract_clusters(
            transaction=transaction,
            aspect_id=aspect.id,
            cluster_ids=created_cluster_ids,
        )

        self._log_status_msg("Successfully split cluster!")

    def change_cluster(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            ChangeClusterParams,
        ), "ChangeClusterParams expected"

        # 0. Read the cluster to change to
        if params.cluster_id == -1:
            cluster = transaction.read_or_create_outlier_cluster(
                aspect_id=transaction.aspect_id
            )
            cluster_id = cluster.id
            logger.info(f"Changing to outlier cluster {cluster.name}.")
        else:
            cluster = transaction.read_cluster(id=params.cluster_id)
            cluster_id = cluster.id
            logger.info(f"Changing to normal cluster {cluster.name}.")

        # Read the current document <-> cluster assignments
        document_clusters = transaction.read_document_clusters_by_aspect(
            aspect_id=transaction.aspect_id
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
        transaction.update_document_clusters(
            ids=[
                (sdoc_id, doc2cluster[sdoc_id].cluster_id)
                for sdoc_id in params.sdoc_ids
            ],
            update_dtos=[
                DocumentClusterUpdate(cluster_id=cluster.id, is_accepted=True)
                for sdoc_id in params.sdoc_ids
            ],
        )

        # 2. Cluster Extraction
        # - Extract the clusters for all affected ones (computing top words, top docs, embedding, etc)
        self._log_status_step(1)
        if len(modified_clusters) > 0:
            self._log_status_msg(
                f"Extracting clusters for {len(modified_clusters)} modified clusters: {modified_clusters}."
            )
            self._extract_clusters(
                transaction=transaction,
                aspect_id=transaction.aspect_id,
                cluster_ids=list(modified_clusters),
            )

        self._log_status_msg("Successfully changed cluster!")

    def __build_training_data(
        self,
        transaction: PerspectivesDBTransaction,
        aspect_id: int,
    ) -> tuple[list[str], list[str], list[int]]:
        # Read the aspect
        aspect = transaction.read_aspect(id=aspect_id)

        # Read all clusters
        all_clusters = aspect.clusters
        cluster2accepted_docs: dict[int, list[int]] = {t.id: [] for t in all_clusters}

        # Read the document aspects
        doc_aspects = aspect.document_aspects
        sdoc_id2doc_aspect: dict[int, DocumentAspectORM] = {
            da.sdoc_id: da for da in doc_aspects
        }

        # Read the current document <-> cluster assignments
        document_clusters = transaction.read_document_clusters_by_aspect(
            aspect_id=aspect.id
        )
        for dc in document_clusters:
            if dc.is_accepted:
                cluster2accepted_docs[dc.cluster_id].append(dc.sdoc_id)

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
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            RefineModelParams,
        ), "RefineModelParams expected"

        # Update the model name, so that a new model is trained
        aspect = transaction.read_aspect(id=transaction.aspect_id)
        model_name = f"project_{aspect.project_id}_aspect_{aspect.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        transaction.update_aspect(
            id=transaction.aspect_id,
            update_dto=AspectUpdateIntern(
                embedding_model=model_name,
            ),
        )

        # 1. Build the training data for the embedding model
        self._log_status_step(0)
        self._log_status_msg("Building training data for the embedding model...")
        train_docs, train_labels, train_doc_ids = self.__build_training_data(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
        )

        # 2. Embed the documents (training the model)
        self._log_status_step(1)
        self._log_status_msg(
            f"Refining cluster model for aspect {transaction.aspect_id} with model {model_name}."
        )
        self._embed_documents(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
            train_docs=train_docs,
            train_labels=train_labels,
        )

        # 3. Cluster the documents
        self._log_status_step(2)
        self._cluster_documents(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
            sdoc_ids=None,
            train_doc_ids=train_doc_ids,
            train_cluster_ids=[int(tl) for tl in train_labels],
        )

        # 4. Extract the clusters
        self._log_status_step(3)
        self._extract_clusters(
            transaction=transaction,
            aspect_id=transaction.aspect_id,
            cluster_ids=None,
        )

        self._log_status_msg("Successfully refined map!")

    def reset_cluster_model(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            ResetModelParams,
        ), "ResetModelParams expected"

        pass

    def recompute_cluster_title_and_description(
        self,
        transaction: PerspectivesDBTransaction,
        params: PerspectivesJobParams,
    ):
        assert isinstance(
            params,
            RecomputeClusterTitleAndDescriptionParams,
        ), "RecomputeClusterTitleAndDescriptionParams expected"

        # 1. Read cluster
        self._log_status_step(0)
        self._log_status_msg(f"Reading top words of cluster {params.cluster_id}...")
        cluster = transaction.read_cluster(id=params.cluster_id)
        top_words = cluster.top_words
        if top_words is None:
            raise ValueError(
                f"Cluster {cluster.id} has no top words, cannot recompute title and description."
            )

        # 2. Compute new title and description
        self._log_status_step(1)
        self._log_status_msg(
            f"Computing new title and description for cluster {cluster.id}..."
        )
        cluster_name, cluster_description = (
            self.__generate_cluster_title_and_description(
                top_words={cluster.id: top_words},
                cluster_ids=[cluster.id],
            )
        )
        self._log_status_msg(
            f"Successfully computed new title and description for cluster {cluster.id}."
        )

        # Store the new title and description in database
        transaction.update_clusters(
            ids=[cluster.id],
            update_dtos=[
                ClusterUpdateIntern(
                    name=cluster_name[cluster.id],
                    description=cluster_description[cluster.id],
                    is_user_edited=False,
                )
            ],
        )

        self._log_status_msg(
            "Recompute Cluster Title And Description completed successfully."
        )
