# Repos

Repositories encapsulate connections to external services (databases, queues, APIs, …).

## Lifecycle convention (important!)

All repos are **auto-discovered and centrally connected** — never connect a repo yourself in a service, system, or endpoint.

- **Discovery**: `main.py` (API) and `worker.py` (RQ workers) find every `RepoBase` subclass in `*_repo.py` files via `import_by_suffix("_repo.py")`.
- **Startup**: each discovered repo's `connect()` is called once per process.
- **Shutdown**: each repo's `close_connection()` is called once per process.

Consumers simply grab the singleton and use the already-established connection:

```python
from repos.redis_repo import RedisRepo

conn = RedisRepo().redis_connection()  # raises if not connected
```

### Rules

1. **Inherit from `RepoBase`** and use `metaclass=SingletonMeta` (one instance per process).
2. **`connect()` / `close_connection()` must be sync and idempotent** — they run in both sync (worker) and async (API lifespan) contexts. Constructing a client is fine; do not perform async I/O here.
3. **Never call `connect()` yourself** outside the central setup. If a connection can only be established lazily (e.g. an async client whose handshake needs a running event loop), construct the client in `connect()` and let the first actual operation establish the connection.
4. Implement `remove_data()` for setup/testing resets.

### Example: sync vs. async clients

- `RedisRepo` — sync `redis.Redis`, used by RQ. `connect()` pings eagerly (safe in both contexts).
- `AsyncRedisRepo` — async `redis.asyncio.Redis`, used by the websocket pub/sub backplane. `connect()` only constructs the client; the connection is established lazily on first use by the websocket manager. This keeps the central repo setup fully synchronous while still following the convention.

## Filesystem (`repos/filesystem`)

The files of DATS are reached through three layers, like the Weaviate collections in `repos/vector`:

- `filesystem_repo.py`: `FilesystemRepo`, the lifecycle only: the root folder (`filesystem.root_directory`), created on `connect`, and the folder of a project (`delete_project` removes it).
- `file_crud_base.py`: `FileCRUDBase`, the generic file CRUD. A subclass names its `folder` and the `entity` (`Crud`) whose id names the subfolder, so its files lie at `projects/<project_id>/<folder>/<id>/<name>`; `url(...)` is that path relative to the content server (`/content/`). Subclasses register themselves and the `*_file_crud.py` modules are discovered with `import_by_suffix`, so deleting an entity deletes its folders in every file CRUD (`FileCRUDBase.delete_by_entity`).
- One concrete file CRUD per kind of file, living with its owner: `crud_sdoc_file` (`core/doc`, the uploads), `crud_thumbnail_file` and `crud_audio_file` (`core/artefacts`), `crud_export_file` (`core/project`), and the models and plots of the classifier, COTA and perspectives modules.

`temporary_file_crud.py` (`crud_temporary_file`) holds the temporary files, one folder per owner below `temporary_files/`: scratch inside one job (`folder()`, deleted at exit) or a handover through a job payload (`create()`, deleted by the consuming job). Temporary folders older than `filesystem.temporary_ttl` and expired exports are deleted at start-up (`bootstrap.delete_expired_files`). A repo never raises `HTTPException`: the upload size limit is `UploadTooLargeError` (413) in `filesystem_exceptions.py`.
