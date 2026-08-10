from huggingface_hub import model_info

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
