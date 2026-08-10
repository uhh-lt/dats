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
    code_ids: list[int],
    merge_children_into_parent: bool,
) -> tuple[list[CodeORM], dict[int, int], dict[int, int], dict[int, str]]:
    """Translates between database codes and the model's numeric label ids.

    Naming convention used throughout the classifier code:

    - ``code_id``: the database world. Arbitrary, non-contiguous IDs of codes
      (e.g. 17, 42, 103).
    - ``label_id``: the classifier world. The contiguous output-neuron indices
      ``0..N`` of the model. Label id ``0`` is always the background "O"
      ("Outside" / no-annotation) class; real classes are ``1..N``.

    A token-classification model has one output neuron per class. This function
    builds the bidirectional mapping between ``code_id`` and ``label_id`` so
    the rest of the pipeline never has to reason about both at once.

    Args:
        db: Database session.
        code_ids: The IDs of the codes the user selected to train/evaluate on.
            When ``merge_children_into_parent`` is True these are expected to be
            parent codes; their descendants are folded into them.
        merge_children_into_parent: How to treat the code hierarchy.

            - False (flat): every selected code is its own class. ``N =
              len(code_ids)`` and each code maps 1:1 to a label id.
            - True (hierarchical): all descendants of a selected code share
              that code's single label id, so a parent and its children are
              learned as one class. ``N`` still equals ``len(code_ids)`` (one
              label per selected parent), but more code ids map onto each label.

    Returns:
        A tuple ``(codes, codeid2labelid, codeid2parentid, labelid2name)``:

        - codes: The ``CodeORM`` objects to link to the classifier. These are
          the *effective* classes — the selected codes themselves (their
          children are represented via ``codeid2parentid``, not linked
          directly).
        - codeid2labelid: ``code_id -> label_id``. Maps every code that can
          appear on an annotation (selected codes and, when merging, all their
          descendants) to its neuron's index. Includes the ``0 -> 0`` ("O")
          sentinel.
        - codeid2parentid: ``code_id -> effective code_id``. Maps each code to
          the class it counts toward (itself when flat, its ancestor when
          merging). Used to aggregate per-class statistics and to decide which
          code to write at inference time. Includes the ``0 -> 0`` sentinel.
        - labelid2name: ``label_id -> class name`` for the model config. Built
          from the same ordered effective-class list as ``codeid2labelid``, so
          label id ``i+1`` is guaranteed to correspond to ``codes[i]``.

    The mappings are derived from a single ordered list of effective classes,
    so the label-id <-> code-id correspondence is consistent by construction;
    an assertion verifies the label ids are exactly ``1..N``.
    """
    requested_codes = crud_code.read_by_ids(db=db, ids=code_ids)
    id2requested = {code.id: code for code in requested_codes}

    if merge_children_into_parent:
        # All descendants of a requested code share that code's single label
        # id, so the number of labels equals the number of requested codes.
        children_per_class = [
            crud_code.read_with_children(db, code_id=code_id) for code_id in code_ids
        ]
        codeid2labelid: dict[int, int] = {
            child.id: i + 1
            for i, children in enumerate(children_per_class)
            for child in children
        }
        codeid2parentid = {
            child.id: parent_id
            for children, parent_id in zip(children_per_class, code_ids)
            for child in children
        }
        # The effective classes are the requested codes themselves.
        effective_classes = requested_codes
    else:
        codeid2labelid = {code.id: i + 1 for i, code in enumerate(requested_codes)}
        codeid2parentid = {code_id: code_id for code_id in code_ids}
        effective_classes = requested_codes

    # Sanity check: the label ids must be exactly 1..N with no gaps or
    # collisions, otherwise the model head and the label mapping disagree.
    label_ids = sorted(set(codeid2labelid.values()))
    assert label_ids == list(range(1, len(effective_classes) + 1)), (
        f"Inconsistent label mapping: label ids {label_ids} do not match "
        f"{len(effective_classes)} effective classes."
    )

    codeid2labelid[O_LABEL_ID] = O_LABEL_ID
    codeid2parentid[O_LABEL_ID] = O_LABEL_ID

    # labelid2name is built from the same ordered effective classes, so label
    # id i+1 is guaranteed to correspond to effective_classes[i].
    labelid2name = {i + 1: code.name for i, code in enumerate(effective_classes)}
    labelid2name[O_LABEL_ID] = O_LABEL_NAME

    # `codes` are the codes linked to the classifier. When merging, link the
    # requested (parent) codes; otherwise link every requested code.
    codes = [id2requested[code_id] for code_id in code_ids]

    return codes, codeid2labelid, codeid2parentid, labelid2name


def build_tag_label_mappings(
    db: Session,
    class_ids: list[int],
) -> tuple[list[TagORM], dict[int, int], dict[int, str]]:
    """Builds the tag class/label mappings.

    Uses the same ``code_id``/``label_id`` convention as
    :func:`build_code_label_mappings`, except here the "db world" ids are tag
    ids. Returns ``(tags, tagid2labelid, labelid2name)``.
    """
    tags = crud_tag.read_by_ids(db=db, ids=class_ids)

    tagid2labelid: dict[int, int] = {tag.id: i + 1 for i, tag in enumerate(tags)}
    tagid2labelid[O_LABEL_ID] = O_LABEL_ID
    labelid2name = {i + 1: tag.name for i, tag in enumerate(tags)}
    labelid2name[O_LABEL_ID] = O_LABEL_NAME

    return tags, tagid2labelid, labelid2name
