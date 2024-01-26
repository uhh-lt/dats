import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/openapi";
import SnackbarAPI from "../features/Snackbar/SnackbarAPI";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      let text = "An unknown error occurred.";
      if (error instanceof ApiError) {
        text = error.message + (error.body.detail ? ": " + error.body.detail : "");
      }
      SnackbarAPI.openSnackbar({
        text,
        severity: "error",
      });
    },
  }),
});

export default queryClient;
