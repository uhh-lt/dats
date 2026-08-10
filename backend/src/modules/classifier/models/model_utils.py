import numpy as np
from datasets import Dataset
from huggingface_hub import model_info
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_orm import TagORM

# Label id reserved for the background / "no annotation" class ("O").
# Real classes get ids 1..N. This convention is baked into trained
# checkpoints and DB label mappings — do NOT change without migrating them.
O_LABEL_ID = 0
O_LABEL_NAME = "O"

# Label id for positions ignored by the loss/metrics (padding, special
# tokens, non-first subwords). PyTorch's default ignore_index.
IGNORE_LABEL_ID = -100


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
    """Splits row indices into train/test, grouping by ``sdoc_id``.

    The same source document can appear multiple times (once per
    annotator). Splitting by row would leak a document into both train and
    test, inflating the evaluation. Splitting by ``sdoc_id`` keeps all
    rows of a document on the same side of the split.
    """
    sdoc_ids = dataset["sdoc_id"]
    unique_sdocs = sorted(set(sdoc_ids))
    rng = np.random.default_rng(seed)
    shuffled = rng.permutation(unique_sdocs)
    n_test = max(1, int(round(len(unique_sdocs) * test_size)))
    test_sdocs = set(shuffled[:n_test].tolist())
    train_idx = [i for i, s in enumerate(sdoc_ids) if s not in test_sdocs]
    test_idx = [i for i, s in enumerate(sdoc_ids) if s in test_sdocs]
    return train_idx, test_idx


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
