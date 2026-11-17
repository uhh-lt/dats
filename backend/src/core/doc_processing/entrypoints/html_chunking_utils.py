import copy
import re
from html import escape
from typing import Any, NamedTuple

from bs4 import BeautifulSoup, Tag
from bs4.element import Comment, NavigableString

# A page marker is an HTML comment like <!-- page 12 --> (as Mistral OCR writes
# them) directly in the body: it starts the page with that number.
PAGE_MARKER_PATTERN = re.compile(r"^\s*page\s+(\d+)\s*$", re.IGNORECASE)


class PageChunk(NamedTuple):
    """One chunk of a document with the pages it covers."""

    html: str
    first_page: int
    last_page: int


class _HtmlStructure(NamedTuple):
    elements: list[Any]
    head_html: str
    html_open_tag: str | None
    body_open_tag: str | None


def _parse_html_structure(html_content: str) -> _HtmlStructure:
    """Parse the HTML into the top-level elements of its body (or of the whole
    document if it has no body), without whitespace-only text, and what is
    needed to wrap a chunk of them like the original document."""
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

    return _HtmlStructure(
        elements=elements,
        head_html=head_html,
        html_open_tag=_opening_tag(soup.find("html")),
        body_open_tag=_opening_tag(body),
    )


def _opening_tag(tag: Any) -> str | None:
    """The opening tag of `tag` with its attributes (e.g. `<html
    class="readability-watermark">`), or None if the document has no such tag."""
    if not isinstance(tag, Tag):
        return None
    attrs = "".join(
        f' {name}="{escape(" ".join(value) if isinstance(value, list) else str(value))}"'
        for name, value in tag.attrs.items()
    )
    return f"<{tag.name}{attrs}>"


def split_html_at_page_markers(
    html_content: str, pages_per_chunk: int
) -> list[PageChunk] | None:
    """
    Split HTML content at its page markers (`<!-- page N -->` comments among
    the top-level elements of the body), `pages_per_chunk` pages per chunk.

    Content before the first marker belongs to the first page. A chunk covers
    the page numbers of its first and last marker.

    Args:
        html_content: The HTML content to split.
        pages_per_chunk: Number of pages per chunk.

    Returns:
        The chunks in document order, or None if the HTML has no page markers
        at the top level.
    """
    structure = _parse_html_structure(html_content)

    # group the elements into pages, each starting at its marker
    pages: list[tuple[int, list[Any]]] = []
    leading_elements: list[Any] = []
    for element in structure.elements:
        if isinstance(element, Comment) and (
            match := PAGE_MARKER_PATTERN.match(str(element))
        ):
            pages.append((int(match.group(1)), [element]))
        elif pages:
            pages[-1][1].append(element)
        else:
            leading_elements.append(element)

    if not pages:
        return None
    pages[0][1][:0] = leading_elements

    chunks: list[PageChunk] = []
    for i in range(0, len(pages), pages_per_chunk):
        chunk_pages = pages[i : i + pages_per_chunk]
        html = _wrap_html_chunk(
            [element for _, page_elements in chunk_pages for element in page_elements],
            structure.head_html,
            structure.html_open_tag,
            structure.body_open_tag,
        )
        chunks.append(
            PageChunk(
                html=html,
                first_page=chunk_pages[0][0],
                last_page=chunk_pages[-1][0],
            )
        )
    return chunks


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
    elements, head_html, html_open_tag, body_open_tag = _parse_html_structure(
        html_content
    )

    if not elements:
        # No elements to split
        return [html_content]

    chunks: list[str] = []
    current_elements: list[Any] = []
    current_length = 0

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
                    current_elements, head_html, html_open_tag, body_open_tag
                )
                chunks.append(chunk_html)
                current_elements = []
                current_length = 0

            # Try to split the large element
            if isinstance(element, Tag):
                sub_chunks = _split_large_element(element, max_chars)
                for sub_chunk_elements in sub_chunks:
                    chunk_html = _wrap_html_chunk(
                        sub_chunk_elements, head_html, html_open_tag, body_open_tag
                    )
                    chunks.append(chunk_html)
            else:
                # It's a text node - split by characters
                text = str(element)
                for i in range(0, len(text), max_chars):
                    text_chunk = text[i : i + max_chars]
                    chunk_html = _wrap_html_chunk(
                        [text_chunk], head_html, html_open_tag, body_open_tag
                    )
                    chunks.append(chunk_html)
            continue

        # Check if adding this element would exceed the limit
        if current_length + element_length > max_chars and current_elements:
            # Save current chunk and start a new one
            chunk_html = _wrap_html_chunk(
                current_elements, head_html, html_open_tag, body_open_tag
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
            current_elements, head_html, html_open_tag, body_open_tag
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
    html_open_tag: str | None,
    body_open_tag: str | None,
) -> str:
    """
    Wrap a list of elements in proper HTML structure.

    Args:
        elements: List of HTML elements/strings to wrap.
        head_html: The head section HTML to include.
        html_open_tag: The opening html tag of the original, if it had one.
        body_open_tag: The opening body tag of the original, if it had one.

    Returns:
        A valid HTML string.
    """
    content = "".join(str(el) for el in elements)

    if body_open_tag is not None:
        content = f"{body_open_tag}{content}</body>"

    if html_open_tag is not None:
        content = f"<!DOCTYPE html>{html_open_tag}{head_html}{content}</html>"
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
    # Create a new tag with the same name and attributes as the parent, but without its original children
    new_tag = copy.copy(parent)
    new_tag.clear()

    for child in children:
        if isinstance(child, NavigableString):
            new_tag.append(str(child))
        else:
            new_tag.append(copy.copy(child))

    return new_tag
