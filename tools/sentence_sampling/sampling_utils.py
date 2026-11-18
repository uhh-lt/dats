import getpass
import hashlib
import os
from pathlib import Path

from dats_api import DATSAPI


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def connect(backend_url: str, username: str) -> DATSAPI:
    """Logs in with the password from DATS_PASSWORD or, without it, from a prompt."""
    password = os.environ.get("DATS_PASSWORD") or getpass.getpass(
        f"Password for {username}: "
    )
    api = DATSAPI(base_url=backend_url, username=username, password=password)
    api.login()
    return api
