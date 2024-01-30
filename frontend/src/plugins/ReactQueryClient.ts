import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/openapi";
import SnackbarAPI from "../features/Snackbar/SnackbarAPI";

function messageFromStringOrFunction(input: unknown, data: unknown): string | undefined {
  if (typeof input === "string") {
    return input;
  } else if (typeof input === "function") {
    return input(data) as string;
  } else {
    return;
  }
}

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      let title = messageFromStringOrFunction(mutation.meta?.errorMessage, error);
      let text = "An unknown error occurred. This is a bug. Please report it to the developers!";
      if (error instanceof ApiError) {
        text = error.message + (error.body ? ": " + error.body : "");
      }
      SnackbarAPI.openSnackbar({
        text,
        title,
        severity: "error",
      });
    },
    onSuccess: (data, _variables, _context, mutation) => {
      let text = messageFromStringOrFunction(mutation.meta?.successMessage, data);
      if (text === undefined) {
        return;
      }

      SnackbarAPI.openSnackbar({
        text,
        severity: "success",
      });
    },
  }),
});

export default queryClient;
