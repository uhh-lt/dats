import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/openapi";
import SnackbarAPI from "../features/Snackbar/SnackbarAPI";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      let title = mutation.meta?.errorDescription as string | undefined;
      let text = "An unknown error occurred. This is a bug. Please report it to the developers!";
      if (error instanceof ApiError) {
        text = error.message + (error.body.detail ? ": " + error.body.detail : "");
      }
      SnackbarAPI.openSnackbar({
        text,
        title,
        severity: "error",
      });
    },
  }),
});

export default queryClient;
