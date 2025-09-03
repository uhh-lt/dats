from huggingface_hub import model_info


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
