"""Output file name construction from Jinja2 templates.

The LLM never constructs file names. Instead, names are built in code from the
original file name and the extracted metadata using a Jinja2 template, e.g.::

    {{ original_stem }}_year-{{ metadata.year }}_month-{{ metadata.month }}

Available variables: ``original_filename``, ``original_stem``,
``original_suffix``, ``metadata`` (dict, may be empty), ``index``.

Missing metadata renders as an empty string; if the rendered name is empty or
identical to the template with all values missing, the original file name is
used as fallback. Names are sanitized and collisions are resolved by appending
``-2``, ``-3``, ...
"""

import re
from pathlib import Path
from typing import Any

from jinja2 import ChainableUndefined, Environment

_env = Environment(undefined=ChainableUndefined, autoescape=False)

_UNSAFE_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_SEPARATORS = re.compile(r"[-_\s]{2,}")


class FilenameTemplateError(Exception):
    """Raised when a filename template cannot be parsed or rendered."""


def sanitize_filename(name: str) -> str:
    """Remove path-unsafe characters and collapse repeated separators."""
    name = _UNSAFE_CHARS.sub("", name)
    name = _SEPARATORS.sub(lambda m: m.group(0)[0], name)
    return name.strip(" ._-")


def render_output_stem(
    template_str: str | None,
    *,
    original_path: Path,
    metadata: dict[str, Any] | None,
    index: int,
) -> str:
    """Render the output file stem (name without extension) for one file.

    Falls back to the original file stem when no template is given, when the
    template renders to an empty string, or when rendering fails.
    """
    original_stem = original_path.stem
    if not template_str:
        return sanitize_filename(original_stem) or "output"

    try:
        template = _env.from_string(template_str)
        rendered = template.render(
            original_filename=original_path.name,
            original_stem=original_stem,
            original_suffix=original_path.suffix,
            metadata=metadata or {},
            index=index,
        )
    except Exception as e:
        msg = f"Failed to render filename template: {e}"
        raise FilenameTemplateError(msg) from e

    stem = sanitize_filename(rendered)
    return stem if stem else original_stem


def resolve_collision(stem: str, suffix: str, used: set[str]) -> str:
    """Return a unique file name for ``stem + suffix`` given already-used names."""
    candidate = f"{stem}{suffix}"
    counter = 2
    while candidate in used:
        candidate = f"{stem}-{counter}{suffix}"
        counter += 1
    used.add(candidate)
    return candidate
