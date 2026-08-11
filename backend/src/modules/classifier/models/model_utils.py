from collections import Counter
from collections.abc import Iterable

import numpy as np
from datasets import Dataset
from huggingface_hub import model_info
from sklearn.model_selection import GroupShuffleSplit
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_orm import TagORM
from modules.classifier.classifier_exceptions import InvalidDatasetSplitError

# Label id reserved for the background / "no annotation" class ("O").
# Real classes get ids 1..N. This convention is baked into trained
# checkpoints and DB label mappings — do NOT change without migrating them.
O_LABEL_ID = 0
O_LABEL_NAME = "O"

# Label id for positions ignored by the loss/metrics (padding, special
# tokens, non-first subwords). PyTorch's default ignore_index.
IGNORE_LABEL_ID = -100
GROUPED_SPLIT_CANDIDATES = 100


def compute_balanced_class_weights(
    labels: Iterable[int],
    num_labels: int,
    ignored_label_ids: frozenset[int] = frozenset(),
) -> list[float]:
    """Compute inverse-frequency weights for a classification loss.

    Each observed class receives ``N / (K * class_count)``, where ``N`` is the
    number of contributing training labels and ``K`` is the model's number of
    classes. Ignored labels do not contribute. Classes absent from the training
    data receive the neutral weight ``1.0``.
    """
    if num_labels <= 0:
        raise ValueError("The number of labels must be positive.")

    label_counts = Counter(label for label in labels if label not in ignored_label_ids)
    invalid_label_ids = sorted(
        label for label in label_counts if label < 0 or label >= num_labels
    )
    if invalid_label_ids:
        raise ValueError(
            f"Training labels contain ids outside [0, {num_labels}): "
            f"{invalid_label_ids}"
        )

    total_labels = sum(label_counts.values())
    if total_labels == 0:
        raise ValueError("Cannot compute class weights without training labels.")

    return [
        total_labels / (num_labels * label_counts[label])
        if label_counts[label] > 0
        else 1.0
        for label in range(num_labels)
    ]


def check_hf_model_exists(model_name: str) -> bool:
    """Checks if a Hugging Face model exists on the Hub."""
    try:
        model_info(model_name)
        return True
    except Exception:
        return False


def grouped_train_test_split(
    dataset: Dataset, test_size: float = 0.2, seed: int = 42
) -> tuple[list[int], list[int]]:
    """Choose a class-balanced train/validation split grouped by document.

    The algorithm:

    1. Uses scikit-learn's ``GroupShuffleSplit`` so every row and chunk belonging
       to one source document stays entirely in training or validation.
    2. Generates 100 deterministic candidate splits using ``seed``.
    3. Rejects candidates that lose required class coverage: every non-``O``
       class must remain in training, and every class occurring in at least two
       documents must also occur in validation. A class occurring in only one
       document stays in training because it cannot occur in both splits.
    4. Scores the remaining candidates by comparing document-level class
       proportions. For each class, it calculates the absolute difference
       between the proportion of validation documents containing that class and
       the corresponding proportion in the full dataset, then sums those
       differences. Every class contributes equally; lower scores are better and
       zero is a perfect match. Candidate generation stops immediately at zero
       because no later candidate can improve the score.
    5. Chooses the eligible candidate with the best class-distribution score.
    6. Rejects datasets containing only one document and raises a clear error if
       none of the candidates provides the required class coverage.

    A returned split guarantees that training is non-empty, every observed class
    remains represented in training, every class occurring in at least two
    documents is represented in validation, and no document occurs in both
    splits. Classes occurring in only one document remain in training because
    they cannot be represented in both splits. ``O`` and ignored labels do not
    participate in balancing.
    """

    sdoc_ids = [int(sdoc_id) for sdoc_id in dataset["sdoc_id"]]
    unique_sdocs = sorted(set(sdoc_ids))
    if len(unique_sdocs) < 2:
        raise InvalidDatasetSplitError(
            "at least two annotated source documents are required"
        )

    labels_by_sdoc: dict[int, set[int]] = {sdoc_id: set() for sdoc_id in unique_sdocs}
    for sdoc_id, row_labels in zip(sdoc_ids, dataset["labels"]):
        labels_by_sdoc[sdoc_id].update(
            int(label)
            for label in row_labels
            if int(label) not in (O_LABEL_ID, IGNORE_LABEL_ID)
        )

    class_document_counts: dict[int, int] = {}
    for labels in labels_by_sdoc.values():
        for label in labels:
            class_document_counts[label] = class_document_counts.get(label, 0) + 1

    validation_labels = {
        label for label, count in class_document_counts.items() if count >= 2
    }
    full_class_proportions = {
        label: count / len(unique_sdocs)
        for label, count in class_document_counts.items()
    }

    splitter = GroupShuffleSplit(
        n_splits=GROUPED_SPLIT_CANDIDATES,
        test_size=test_size,
        random_state=seed,
    )
    best_candidate: tuple[float, list[int], list[int]] | None = None
    row_indices = np.arange(len(sdoc_ids))
    for train_indices, validation_indices in splitter.split(
        row_indices,
        groups=sdoc_ids,
    ):
        train_sdocs = {sdoc_ids[index] for index in train_indices}
        validation_sdocs = {sdoc_ids[index] for index in validation_indices}
        train_labels = {
            label for sdoc_id in train_sdocs for label in labels_by_sdoc[sdoc_id]
        }
        current_validation_labels = {
            label for sdoc_id in validation_sdocs for label in labels_by_sdoc[sdoc_id]
        }
        if train_labels != set(class_document_counts):
            continue
        if not validation_labels.issubset(current_validation_labels):
            continue

        validation_class_counts = {
            label: sum(label in labels_by_sdoc[sdoc_id] for sdoc_id in validation_sdocs)
            for label in class_document_counts
        }
        # Score the candidate by summing the absolute per-class differences
        # between validation and full-dataset document proportions. This is a
        # macro score: every class contributes equally regardless of frequency.
        # A lower score is better, and zero means all proportions match exactly.
        distribution_score = sum(
            abs(
                validation_class_counts[label] / len(validation_sdocs)
                - full_class_proportions[label]
            )
            for label in class_document_counts
        )
        candidate = (
            distribution_score,
            train_indices.tolist(),
            validation_indices.tolist(),
        )
        if best_candidate is None or candidate[0] < best_candidate[0]:
            best_candidate = candidate
        if distribution_score == 0.0:
            break

    if best_candidate is None:
        raise InvalidDatasetSplitError(
            f"none of {GROUPED_SPLIT_CANDIDATES} deterministic candidates kept "
            "every class in training and every class supported by at least two "
            "documents in validation; adjust the validation split or add "
            "annotated documents"
        )

    _, train_indices, validation_indices = best_candidate
    return train_indices, validation_indices


def build_code_label_mappings(
    db: Session,
    code_ids: list[int],
) -> tuple[list[CodeORM], dict[int, int], dict[int, str]]:
    """Builds the bidirectional mapping between database code ids and the
    model's contiguous label ids (0 = "O", real classes are 1..N).

    Returns ``(codes, codeid2labelid, labelid2name)``; ``codeid2labelid``
    includes the ``0 -> 0" ("O") sentinel.
    """
    codes = crud_code.read_by_ids(db=db, ids=code_ids)

    codeid2labelid: dict[int, int] = {code.id: i + 1 for i, code in enumerate(codes)}
    codeid2labelid[O_LABEL_ID] = O_LABEL_ID
    labelid2name = {i + 1: code.name for i, code in enumerate(codes)}
    labelid2name[O_LABEL_ID] = O_LABEL_NAME

    return codes, codeid2labelid, labelid2name


def build_tag_label_mappings(
    db: Session,
    class_ids: list[int],
) -> tuple[list[TagORM], dict[int, int], dict[int, str]]:
    """Buidls the bidirectional mapping between database tag ids and the
    model's contiguous label ids (0 = "O", real classes are 1..N).

    Returns ``(tags, tagid2labelid, labelid2name)``; ``tagid2labelid``
    includes the ``0 -> 0" ("O") sentinel.
    """
    tags = crud_tag.read_by_ids(db=db, ids=class_ids)

    tagid2labelid: dict[int, int] = {tag.id: i + 1 for i, tag in enumerate(tags)}
    tagid2labelid[O_LABEL_ID] = O_LABEL_ID
    labelid2name = {i + 1: tag.name for i, tag in enumerate(tags)}
    labelid2name[O_LABEL_ID] = O_LABEL_NAME

    return tags, tagid2labelid, labelid2name
