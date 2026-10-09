import { JobStatus } from "@models/JobStatus";
import { useAppSelector } from "@store/storeHooks";

// Minimal structural view of a react-query Query's state. react-query's `Query`
// type is invariant in its data type, so we cannot type the callback parameter
// as `Query<T | null>` — a structural type keeps the helper assignable to every
// `refetchInterval` signature.
interface QueryStateLike<T> {
  state: {
    data?: T | null;
    error: unknown;
  };
}

// Job updates arrive via websocket (JOB_UPDATED) and are written directly into
// the query cache, so no polling is needed while the websocket is connected.
// When the websocket is down, fall back to polling until the job reaches a
// terminal state.
export function useJobRefetchInterval<T extends { status: JobStatus }>(intervalMs = 1000) {
  const isConnected = useAppSelector((state) => state.websocket.status === "connected");
  return (query: QueryStateLike<T>): number | false => {
    if (!isConnected) {
      if (query.state.error) return false;
      const status = query.state.data?.status;
      if (!status) return intervalMs;
      switch (status) {
        case JobStatus.CANCELED:
        case JobStatus.FAILED:
        case JobStatus.FINISHED:
        case JobStatus.STOPPED:
          return false;
        case JobStatus.DEFERRED:
        case JobStatus.QUEUED:
        case JobStatus.SCHEDULED:
        case JobStatus.STARTED:
          return intervalMs;
        default:
          return false;
      }
    }
    // Websocket is connected: only poll until the first data arrives (the
    // initial fetch may race the QUEUED event); updates come via JOB_UPDATED.
    return query.state.data ? false : intervalMs;
  };
}
