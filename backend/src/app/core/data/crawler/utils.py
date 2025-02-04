import re
import unicodedata


def slugify(input_str: str, allow_unicode: bool = False):
    """
    Convert to ASCII if 'allow_unicode' is False. Convert spaces or repeated
    dashes to single dashes. Remove characters that aren't alphanumerics,
    underscores, or hyphens. Convert to lowercase. Also strip leading and
    trailing whitespace, dashes, and underscores.
    """
    input_str = str(input_str)
    if allow_unicode:
        input_str = unicodedata.normalize("NFKC", input_str)
    else:
        input_str = (
            unicodedata.normalize("NFKD", input_str)
            .encode("ascii", "ignore")
            .decode("ascii")
        )
    input_str = re.sub(r"[^\w\s-]", "", input_str.lower())
    return re.sub(r"[-\s]+", "-", input_str).strip("-_")
