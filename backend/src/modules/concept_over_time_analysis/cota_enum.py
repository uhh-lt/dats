from enum import Enum


class DimensionalityReductionAlgorithm(str, Enum):
    UMAP = "umap"
    PCA = "pca"
    TSNE = "tsne"
