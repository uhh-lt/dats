import re
from typing import Any

from bs4 import BeautifulSoup, NavigableString, Tag


def split_html_into_chunks(html_content: str, max_chars: int) -> list[str]:
    """
    Split HTML content into chunks at element boundaries.

    Each chunk is valid HTML with properly opened/closed tags.

    Args:
        html_content: The HTML content to split.
        max_chars: Maximum number of characters per chunk.

    Returns:
        A list of valid HTML chunks.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract head content if present (to include in each chunk)
    head = soup.find("head")
    head_html = str(head) if head else ""

    # Find the body or use the whole document
    body = soup.find("body")
    if body and isinstance(body, Tag):
        elements = list(body.children)
    else:
        # No body tag - treat all top-level elements as content
        elements = list(soup.children)

    # Filter out whitespace-only NavigableStrings
    elements = [el for el in elements if not (isinstance(el, str) and el.strip() == "")]

    if not elements:
        # No elements to split
        return [html_content]

    chunks: list[str] = []
    current_elements: list[Any] = []
    current_length = 0

    # Detect document structure for wrapping
    has_html_tag = soup.find("html") is not None
    has_body_tag = body is not None

    # Note: We do NOT subtract wrapper overhead from max_chars.
    # The wrapper (html, head, body tags) is structural and should not
    # count towards the content character limit.

    for element in elements:
        element_html = str(element)
        element_length = _get_content_length(element_html)

        # If a single element exceeds max_chars, we need to handle it specially
        if element_length > max_chars:
            # Save current accumulated content first
            if current_elements:
                chunk_html = _wrap_html_chunk(
                    current_elements, head_html, has_html_tag, has_body_tag
                )
                chunks.append(chunk_html)
                current_elements = []
                current_length = 0

            # Try to split the large element
            if isinstance(element, Tag):
                sub_chunks = _split_large_element(element, max_chars)
                for sub_chunk_elements in sub_chunks:
                    chunk_html = _wrap_html_chunk(
                        sub_chunk_elements, head_html, has_html_tag, has_body_tag
                    )
                    chunks.append(chunk_html)
            else:
                # It's a text node - split by characters
                text = str(element)
                for i in range(0, len(text), max_chars):
                    text_chunk = text[i : i + max_chars]
                    chunk_html = _wrap_html_chunk(
                        [text_chunk], head_html, has_html_tag, has_body_tag
                    )
                    chunks.append(chunk_html)
            continue

        # Check if adding this element would exceed the limit
        if current_length + element_length > max_chars and current_elements:
            # Save current chunk and start a new one
            chunk_html = _wrap_html_chunk(
                current_elements, head_html, has_html_tag, has_body_tag
            )
            chunks.append(chunk_html)
            current_elements = [element]
            current_length = element_length
        else:
            # Add element to current chunk
            current_elements.append(element)
            current_length += element_length

    # Don't forget the last chunk
    if current_elements:
        chunk_html = _wrap_html_chunk(
            current_elements, head_html, has_html_tag, has_body_tag
        )
        chunks.append(chunk_html)

    return chunks


def _get_content_length(element_html: str) -> int:
    """
    Calculate the content length of an HTML element, excluding img tags.

    Base64-encoded images can be very large but aren't actual text content,
    so we exclude them from the character count.

    Args:
        element_html: The HTML string to measure.

    Returns:
        The length of the HTML string with img tags removed.
    """
    # Pattern to match img tags with their content (including base64 data)
    IMG_TAG_PATTERN = re.compile(r"<img[^>]*>", re.IGNORECASE | re.DOTALL)

    # Remove img tags from the string for length calculation
    content_without_images = IMG_TAG_PATTERN.sub("", element_html)
    return len(content_without_images)


def _wrap_html_chunk(
    elements: list[Any],
    head_html: str,
    has_html_tag: bool,
    has_body_tag: bool,
) -> str:
    """
    Wrap a list of elements in proper HTML structure.

    Args:
        elements: List of HTML elements/strings to wrap.
        head_html: The head section HTML to include.
        has_html_tag: Whether the original had an html tag.
        has_body_tag: Whether the original had a body tag.

    Returns:
        A valid HTML string.
    """
    content = "".join(str(el) for el in elements)

    if has_body_tag:
        content = f"<body>{content}</body>"

    if has_html_tag:
        content = f"<!DOCTYPE html><html>{head_html}{content}</html>"
    elif head_html:
        content = f"{head_html}{content}"

    return content


def _split_large_element(element: Tag, max_chars: int) -> list[list[Any]]:
    """
    Split a large HTML element into smaller chunks by its children.

    Args:
        element: The HTML element to split.
        max_chars: Maximum characters per chunk.

    Returns:
        A list of element lists, each representing a chunk's content.
    """
    children = list(element.children)
    children = [
        ch
        for ch in children
        if not (isinstance(ch, NavigableString) and ch.strip() == "")
    ]

    if not children:
        # Element has no children - can't split further, return as-is
        return [[element]]

    # Calculate wrapper overhead for this element's tag
    tag_name = element.name
    attrs = (
        "".join(f' {k}="{v}"' for k, v in element.attrs.items())
        if element.attrs
        else ""
    )
    wrapper_overhead = len(f"<{tag_name}{attrs}></{tag_name}>")
    effective_max = max_chars - wrapper_overhead

    if effective_max <= 0:
        # Can't fit wrapper, just return element as-is
        return [[element]]

    chunks: list[list[Any]] = []
    current_children: list[Any] = []
    current_length = 0

    for child in children:
        child_html = str(child)
        child_length = _get_content_length(child_html)

        # If single child is too large, recursively split it
        if child_length > effective_max:
            # Save current content first
            if current_children:
                wrapped = _wrap_element_children(element, current_children)
                chunks.append([wrapped])
                current_children = []
                current_length = 0

            if isinstance(child, Tag):
                sub_chunks = _split_large_element(child, effective_max)
                for sub_chunk in sub_chunks:
                    # Wrap each sub-chunk in the parent element
                    wrapped = _wrap_element_children(element, sub_chunk)
                    chunks.append([wrapped])
            else:
                # Text node - split by characters
                text = str(child)
                for i in range(0, len(text), effective_max):
                    text_chunk = text[i : i + effective_max]
                    wrapped = _wrap_element_children(element, [text_chunk])
                    chunks.append([wrapped])
            continue

        # Check if adding this child would exceed the limit
        if current_length + child_length > effective_max and current_children:
            wrapped = _wrap_element_children(element, current_children)
            chunks.append([wrapped])
            current_children = [child]
            current_length = child_length
        else:
            current_children.append(child)
            current_length += child_length

    # Don't forget the last chunk
    if current_children:
        wrapped = _wrap_element_children(element, current_children)
        chunks.append([wrapped])

    return chunks


def _wrap_element_children(parent: Tag, children: list[Any]) -> Tag:
    """
    Create a new element with the same tag and attributes as parent, containing the given children.

    Args:
        parent: The parent element to clone.
        children: The children to include in the new element.

    Returns:
        A new Tag with the same properties as parent but with specified children.
    """
    # Create a new soup to build the element
    new_soup = BeautifulSoup("", "html.parser")
    new_tag = new_soup.new_tag(parent.name, attrs=parent.attrs)

    for child in children:
        if isinstance(child, NavigableString):
            new_tag.append(str(child))
        elif isinstance(child, str):
            new_tag.append(child)
        else:
            # Need to copy the child to avoid modifying original
            child_copy = BeautifulSoup(str(child), "html.parser")
            for item in child_copy.children:
                new_tag.append(item)

    return new_tag
