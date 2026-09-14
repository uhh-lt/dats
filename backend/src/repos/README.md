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
