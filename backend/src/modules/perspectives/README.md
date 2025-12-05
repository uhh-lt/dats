# Perspectives Module Documentation

## Overview

The **Perspectives** module is a generic, unsupervised clustering and visualization engine. It allows users to create different "views" (Aspects) on their data (SourceDocuments) by applying various transformation and analysis pipelines.

Unlike rigid categorization systems, Perspectives is designed to be flexible and explorative. It supports:

- **Document Modification**: using LLMs to rewrite or extract specific information from documents before analysis.
- **Embedding**: Converting text (or images) into vector representations (using generic or fine-tuned models).
- **Dimensionality Reduction**: Using UMAP to project high-dimensional data into 2D for visualization.
- **Clustering**: Using HDBSCAN to find natural groupings in the data.
- **Topic Modeling**: Automatically extracting titles and descriptions for clusters using c-TF-IDF.
- **Hierarchical Clustering**: Organizing clusters into levels.

## Technologies Used

This module leverages a modern stack for NLP and Data Analysis:

- **FastAPI**: For the REST API endpoints.
- **SQLAlchemy**: For ORM and PostgreSQL interaction.
- **Weaviate**: As the Vector Database for storing embeddings.
- **SentenceTransformers / SetFit**: For generating embeddings and training custom small-shot models (`PromptEmbedder`).
- **UMAP** (Uniform Manifold Approximation and Projection): For dimensionality reduction.
- **HDBSCAN**: For density-based clustering.
- **Matplotlib**: For generating static map thumbnails.
- **Scikit-Learn**: For computing TF-IDF

## Data Structure

The data model is split between **PostgreSQL** (metadata, relational structure) and **Weaviate** (vectors).

### PostgreSQL Entities (ORMs)

1.  **`AspectORM`** (`aspect` table)

    - **Purpose**: Represents a specific "perspective" or analysis run. Contains configuration (prompts, models, pipeline settings).
    - **Key Fields**:
      - `doc_modification_prompt`: Instructions for the LLM to rewrite docs (optional).
      - `doc_embedding_prompt`: Instructions/Context for the embedding model.
      - `embedding_model`: Name of the model used (e.g., 'default' or a custom trained one).
      - `pipeline_settings`: JSON blob for tuning algorithm parameters (UMAP neighbors, HDBSCAN min cluster size, etc.).
    - **Relationships**:
      - **Belongs to** a `Project` (Many-to-One).
      - **Uses** a `Tag` (Many-to-One, optional).
      - **Has many** `Clusters` (One-to-Many).
      - **Has many** `SourceDocuments` (Many-to-Many through `DocumentAspect`).

2.  **`DocumentAspectORM`** (`documentaspect` table)

    - **Purpose**: Represents a single document _within_ a specific Aspect. Since an Aspect can modify the document content (e.g. "Extract only sentiment"), we store this modified content separately from the original `SourceDocument`.
    - **Key Fields**:
      - `sdoc_id`, `aspect_id`: Composite Primary Key.
      - `content`: The (potentially modified) text used for embedding.
      - `x`, `y`: 2D coordinates for the visualization.
    - **Relationships**:
      - **Links** `SourceDocument` and `Aspect`.

3.  **`ClusterORM`** (`cluster` table)

    - **Purpose**: Represents a group of documents found by HDBSCAN.
    - **Key Fields**:
      - `name`, `description`: Generated topic label.
      - `top_words`, `top_word_scores`: Keywords extracted via c-TF-IDF.
      - `level`: For hierarchical clustering (0 = base level).
      - `is_outlier`: Boolean flag (HDBSCAN outlier cluster).
      - `x`, `y`: Centroid coordinates.
    - **Relationships**:
      - **Belongs to** an `Aspect`.
      - **Parent/Child** hierarchy (Self-referential).
      - **Has many** `SourceDocuments` (Many-to-Many through `DocumentCluster`).

4.  **`DocumentClusterORM`** (`documentcluster` table)
    - **Purpose**: The link between a document and a cluster.
    - **Key Fields**:
      - `is_accepted`: Used for **Active Learning**. Users can manually confirm a document belongs to a cluster.
    - **Relationships**:
      - **Links** `SourceDocument` and `Cluster`.

### Vector Database (Weaviate)

- **AspectEmbeddings**: Stores the high-dimensional vector for each `DocumentAspect`.
- **ClusterEmbeddings**: Stores the centroid vector of a cluster.

## Architecture & Core Files

### `PerspectivesService` (`perspectives_service.py`)

This is the core engine. It manages the long-running **Jobs** that process data.
Major pipeline steps handled here:

1.  **`_modify_documents`**: Calls LLM to rewrite docs if a prompt is provided.
2.  **`_embed_documents`**: Uses `PromptEmbedder` to get vectors, calculates UMAP 2D coords.
3.  **`_cluster_documents`**: Runs UMAP (reduction) -> HDBSCAN -> Database Persistence.
4.  **Topic Extraction**: Computes c-TF-IDF to find top words for each cluster.

### `PromptEmbedder` (`prompt_embedder.py`)

A wrapper around `SentenceTransformers` and `SetFit`.

- Handles **Model Fine-tuning**: If training data is provided, it trains a SetFit model on the fly.
- Handles **Inference**: Generates embeddings for text or images.

### `PerspectivesEndpoint` (`perspectives_endpoint.py`)

The API surface. Key interactions:

- **Jobs**: POST `/job/{aspect_id}` starts the pipeline (async).
- **CRUD**: Standard Create/Read/Update/Delete for Aspects.
- **Visualization**: POST `/visualize_documents/{aspect_id}` returns data for the frontend Scatterplot (docs, coords, cluster colors).
- **Labeling**: POST `/label_accept` / `/label_revert` for user feedback.

## API & Frontend Interaction

1.  **Creation**: Frontend calls `create_aspect` (PUT `/aspect`). This immediately triggers a background Job.
2.  **Monitoring**: Frontend polls `/job/{job_id}` to show a progress bar.
3.  **Visualization**:
    - Call `/visualize_documents/{aspect_id}` to get all points (x, y) and their cluster assignments.
    - Call `/cluster_similarities/{aspect_id}` to get a similarity matrix for the cluster map.
4.  **Interaction**:
    - When a user clicks a point, frontend fetches details via `/aspect/{aspect_id}/sdoc/{sdoc_id}`.
    - When a user "accepts" a cluster suggestion, frontend calls `/label_accept`.
