from loguru import logger


def split_text_into_chunks(text: str, max_chars: int) -> list[str]:
    """
    Split text into chunks of at most max_chars characters.

    Attempts to split at line breaks to preserve document structure.
    If no line breaks exist, falls back to hard character splitting.

    Args:
        text: The text content to split.
        max_chars: Maximum number of characters per chunk.

    Returns:
        A list of text chunks.
    """
    # Check if text contains line breaks
    has_line_breaks = "\n" in text

    if has_line_breaks:
        return _split_text_by_lines(text, max_chars)
    else:
        # No line breaks - fall back to hard character splitting
        logger.warning(
            "Text has no line breaks. Falling back to hard character splitting, "
            "which may split words."
        )
        return _split_text_by_chars(text, max_chars)


def _split_text_by_lines(text: str, max_chars: int) -> list[str]:
    """
    Split text into chunks at line breaks, respecting the character limit.

    Args:
        text: The text content to split.
        max_chars: Maximum number of characters per chunk.

    Returns:
        A list of text chunks split at line boundaries.
    """
    lines = text.split("\n")
    chunks: list[str] = []
    current_chunk_lines: list[str] = []
    current_chunk_length = 0

    for line in lines:
        # Calculate length including the newline character we'll add back
        line_length = len(line) + 1  # +1 for the newline

        # If a single line exceeds max_chars, we need to split it
        if line_length > max_chars:
            # First, save any accumulated content
            if current_chunk_lines:
                chunks.append("\n".join(current_chunk_lines))
                current_chunk_lines = []
                current_chunk_length = 0

            # Split the long line by characters
            line_chunks = _split_text_by_chars(line, max_chars)
            chunks.extend(line_chunks)
            continue

        # Check if adding this line would exceed the limit
        new_length = current_chunk_length + line_length
        if current_chunk_lines:
            # Account for the newline between existing content and new line
            new_length = current_chunk_length + line_length

        if new_length > max_chars and current_chunk_lines:
            # Save current chunk and start a new one
            chunks.append("\n".join(current_chunk_lines))
            current_chunk_lines = [line]
            current_chunk_length = line_length
        else:
            # Add line to current chunk
            current_chunk_lines.append(line)
            current_chunk_length = new_length

    # Don't forget the last chunk
    if current_chunk_lines:
        chunks.append("\n".join(current_chunk_lines))

    return chunks


def _split_text_by_chars(text: str, max_chars: int) -> list[str]:
    """
    Split text into chunks of exactly max_chars characters (hard split).

    This is a fallback when no line breaks are available.

    Args:
        text: The text content to split.
        max_chars: Maximum number of characters per chunk.

    Returns:
        A list of text chunks.
    """
    chunks: list[str] = []
    for i in range(0, len(text), max_chars):
        chunks.append(text[i : i + max_chars])
    return chunks
