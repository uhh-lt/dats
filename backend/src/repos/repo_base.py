from abc import ABC, abstractmethod


class RepoBase(ABC):
    """
    Base class for all repository implementations in the DATS backend.

    ## Repository Protocol

    All repositories should follow this protocol:

    1. **Lazy Connection**: Repositories should NOT establish connections in `__init__` or during instantiation.
    Instead, connections should be established lazily when needed.

    2. **Connection Management**: Implement `connect()` and `close_connection()` methods to manage
    the lifecycle of external connections (databases, APIs, etc.).

    3. **Reset Functionality**: Implement `remove_data()` to clear all data for setup/testing
    purposes.

    4. **Singleton Pattern**: All repositories should use `SingletonMeta` to ensure only one instance
    exists per process.

    ## Example Implementation

    ```python
    from common.singleton_meta import SingletonMeta
    from repos.repo_base import RepoBase


    class MyRepo(metaclass=SingletonMeta):
        def __init__(self):
            # DO NOT connect to external services here!
            # Only initialize configuration and state
            self._connected = False
            self._client = None

        def connect(self) -> None:
            if self._connected:
                return

            # Create client/connection
            self._client = create_client()
            self._connected = True
            logger.info("Connected to MyRepo service")

        def close_connection(self) -> None:
            if not self._connected:
                return

            if self._client:
                self._client.close()
                self._client = None
            self._connected = False
            logger.info("Closed connection to MyRepo service")

        def remove_data(self) -> None:
            # Clear all data, recreate indices, etc.
            if self._connected:
                self._client.clear_all()
                logger.info("Reset data in MyRepo")
    ```

    ## Usage in Application Lifecycle

    Repositories are connected, reset and closed only by the building blocks in
    `bootstrap.py` (e.g. `connect_repos`, `delete_all_data`, `close_repos`),
    which all entry points (API, workers, setup, tests) share. Every subclass of
    `RepoBase` in a `*_repo.py` file is discovered and connected automatically.
    """

    @abstractmethod
    def connect(self) -> None:
        """
        Establish connection to the external service.

        This method should be idempotent - calling it multiple times should
        not create multiple connections.
        """

    @abstractmethod
    def close_connection(self) -> None:
        """
        Close the connection to the external service and clean up resources.

        This method should be idempotent - calling it multiple times should
        be safe and have no effect if already closed.
        """

    @abstractmethod
    def remove_data(self) -> None:
        """
        Remove all data in the repository.
        """
