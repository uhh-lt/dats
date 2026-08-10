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
    """
    Checks if a Hugging Face model exists on the Hub.

    Args:
        model_name: The model ID (e.g., "bert-base-uncased").

    Returns:
        True if the model exists, False otherwise.
    """
    try:
        model_info(model_name)
        return True
    except Exception:
        return False


def build_code_label_mappings(
    db: Session,
    class_ids: list[int],
    merge_children_into_parent: bool,
) -> tuple[list[CodeORM], dict[int, int], dict[int, int], dict[int, str]]:
    """Builds the code class/label mappings.

    Returns (codes, classid2labelid, code2parent, id2label).
    """
    codes = crud_code.read_by_ids(db=db, ids=class_ids)

    if merge_children_into_parent:
        child_codes = [crud_code.read_with_children(db, code_id=id) for id in class_ids]
        # All children of a parent share the parent's single label id, so
        # that the number of labels equals the number of parent classes.
        classid2labelid: dict[int, int] = {
            c.id: i + 1 for i, children in enumerate(child_codes) for c in children
        }
        code2parent = {
            code.id: parent
            for children, parent in zip(child_codes, class_ids)
            for code in children
        }
    else:
        classid2labelid = {code.id: i + 1 for i, code in enumerate(codes)}
        code2parent = {code: code for code in class_ids}

    classid2labelid[O_LABEL_ID] = O_LABEL_ID
    id2label = {i + 1: code.name for i, code in enumerate(codes)}
    id2label[O_LABEL_ID] = O_LABEL_NAME
    code2parent[O_LABEL_ID] = O_LABEL_ID

    return codes, classid2labelid, code2parent, id2label


def build_tag_label_mappings(
    db: Session,
    class_ids: list[int],
) -> tuple[list[TagORM], dict[int, int], dict[int, str]]:
    """Builds the tag class/label mappings.

    Returns (tags, classid2labelid, id2label).
    """
    tags = crud_tag.read_by_ids(db=db, ids=class_ids)

    classid2labelid: dict[int, int] = {tag.id: i + 1 for i, tag in enumerate(tags)}
    classid2labelid[O_LABEL_ID] = O_LABEL_ID
    id2label = {i + 1: tag.name for i, tag in enumerate(tags)}
    id2label[O_LABEL_ID] = O_LABEL_NAME

    return tags, classid2labelid, id2label
