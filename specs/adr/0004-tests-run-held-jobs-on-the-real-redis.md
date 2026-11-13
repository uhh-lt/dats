# ADR 0004: Tests run held jobs on the real Redis

**Date:** 2026-11-12

Tests hold the jobs a request starts on queues of the real test Redis and run them in-process through the real job handler; there is no in-memory queue. The architecture review first suggested a queue port with an in-memory adapter and dropped it, because the tests already run a real Redis (ADR 0001) and `Job` wraps RQ's job object, so the second adapter would be a fake of RQ.
