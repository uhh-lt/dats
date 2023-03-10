import re
import unicodedata
from pathlib import Path
from typing import Union


def validate_output_dir(output_dir: Union[str, None]) -> Path:
    if output_dir is None:
        print(
            "You have to provide an output directory with -a output_directory=/path/to/directory"
        )
        exit()

    output_dir = Path(output_dir)
    if output_dir.is_file():
        print(f"{output_dir} cannot be a file!")
        exit()
    output_dir.mkdir(parents=True, exist_ok=True)

    return output_dir


def slugify(value, allow_unicode=False):
    """
    Convert to ASCII if 'allow_unicode' is False. Convert spaces or repeated
    dashes to single dashes. Remove characters that aren't alphanumerics,
    underscores, or hyphens. Convert to lowercase. Also strip leading and
    trailing whitespace, dashes, and underscores.
    """
    value = str(value)
    if allow_unicode:
        value = unicodedata.normalize("NFKC", value)
    else:
        value = (
            unicodedata.normalize("NFKD", value)
            .encode("ascii", "ignore")
            .decode("ascii")
        )
    value = re.sub(r"[^\w\s-]", "", value.lower())
    return re.sub(r"[-\s]+", "-", value).strip("-_")
