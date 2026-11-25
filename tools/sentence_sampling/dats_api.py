"""A read-only DATS API client for the sentence sampling scripts.

Adapted from tools/importer/dats_api.py: it keeps only the calls the sampling needs,
is safe to use from several threads, refreshes an expired access token and retries
transient failures.
"""

import threading
import time
from typing import Any

import requests
from loguru import logger

MAX_ATTEMPTS = 5
TIMEOUT_SECONDS = 120


class DATSAPIError(Exception):
    """Raised when a request still fails after all attempts."""


class DATSAPI:
    def __init__(self, base_url: str, username: str, password: str) -> None:
        self.base_url = base_url if base_url.endswith("/") else base_url + "/"
        self.username = username
        self.password = password
        self.access_token: str | None = None
        self.refresh_token: str | None = None
        self._token_lock = threading.Lock()
        self._local = threading.local()

    # AUTHENTICATION

    def login(self) -> None:
        r = requests.post(
            self.base_url + "authentication/login",
            data={"username": self.username, "password": self.password},
            timeout=TIMEOUT_SECONDS,
        )
        r.raise_for_status()
        self._set_tokens(r.json())
        logger.info(f"Logged in as {self.username}")

    def _refresh(self, stale_access_token: str | None) -> None:
        with self._token_lock:
            # another thread refreshed the token in the meantime
            if self.access_token != stale_access_token:
                return
            r = requests.post(
                self.base_url + "authentication/refresh_access",
                params={"refresh_token": self.refresh_token},
                timeout=TIMEOUT_SECONDS,
            )
            if r.ok:
                self._set_tokens(r.json())
                logger.info("Refreshed the access token")
                return
            logger.warning("Refreshing the access token failed, logging in again")
            self.login()

    def _set_tokens(self, data: dict[str, Any]) -> None:
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]

    # REQUESTS

    def _session(self) -> requests.Session:
        session = getattr(self._local, "session", None)
        if session is None:
            session = requests.Session()
            self._local.session = session
        return session

    def _get(self, path: str, allow_404: bool = False) -> Any:
        """GETs the path and returns its JSON; None for a 404 if allow_404."""
        for attempt in range(1, MAX_ATTEMPTS + 1):
            access_token = self.access_token
            try:
                r = self._session().get(
                    self.base_url + path,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=TIMEOUT_SECONDS,
                )
            except (requests.ConnectionError, requests.Timeout) as e:
                logger.warning(f"GET {path} failed ({e}), attempt {attempt}")
                time.sleep(2**attempt)
                continue
            if r.status_code == 401:
                self._refresh(access_token)
                continue
            if r.status_code >= 500:
                logger.warning(
                    f"GET {path} returned {r.status_code}, attempt {attempt}"
                )
                time.sleep(2**attempt)
                continue
            if r.status_code == 404 and allow_404:
                return None
            r.raise_for_status()
            return r.json()
        raise DATSAPIError(f"GET {path} failed after {MAX_ATTEMPTS} attempts")

    # PROJECT

    def read_project_users(self, project_id: int) -> list[dict[str, Any]]:
        """The members and virtual users of the project."""
        return self._get(f"user/{project_id}/user")

    def read_project_codes(self, project_id: int) -> list[dict[str, Any]]:
        return self._get(f"code/project/{project_id}")

    # PROJECT METADATA

    def read_all_project_metadata(self, project_id: int) -> list[dict[str, Any]]:
        return self._get(f"projmeta/project/{project_id}")

    # SOURCE DOCUMENTS

    def read_sdocs_by_status(
        self, project_id: int, status: int
    ) -> list[dict[str, Any]]:
        """All documents of the project with the document status
        (-100 erroneous, 0 processing, 1 finished)."""
        return self._get(
            f"projects/{project_id}/doc-processing/status?status={status}"
        )

    def read_sdoc_data(self, project_id: int, sdoc_id: int) -> dict[str, Any]:
        return self._get(f"projects/{project_id}/source-documents/{sdoc_id}/data")

    def read_sdoc_metadata_by_key(
        self, project_id: int, sdoc_id: int, key: str
    ) -> dict[str, Any] | None:
        """The metadata value of the document, None if it has none for the key."""
        return self._get(
            f"sdocmeta/sdoc/{sdoc_id}/metadata/{key}?project_id={project_id}",
            allow_404=True,
        )
