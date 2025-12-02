---
applyTo: "frontend/src/views/perspectives/**/*.ts, frontend/src/views/perspectives/**/*.tsx, backend/src/modules/perspectives/**/*.py"
---

## Perspectives

Perspectives is an interactive document clustering extension for DATS.
The frontend provides an interface for creating and managing perspectives, a dashboard for visualizing document clusters, and an interactive document map for exploring clustered documents.
The backend handles the clustering pipeline and data management.

### The Clustering Pipeline

The flexible, aspect-focused clustering pipeline combines (a) LLM-driven document rewriting to emphasize user-defined aspects, (b) instruction-steered embeddings to generate aspect-oriented document representations, and (c) few-shot fine-tuning of the embedding model to further align the representations with user intent.
The main steps of the clustering pipeline are:

1. Rewriting: LLM rewrites documents based on a prompt, resulting in alternative document representations.
2. Instruction-steered embeddings: Documents representations are computed based on an instruction with instruction-steered embedding model.
3. Dimensionality reduction: reduce dimensionality with UMAP.
4. Clustering: cluster documents with HDBSCAN.
5. Compute cluster representations: centroids, keywords (with TF-IDF), and titles + summaries using an LLM.
