import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/openapi/core/ApiError.ts";
import { CRUDDialogActions } from "../components/dialogSlice.ts";
import { store } from "../store/store.ts";

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
      const title = messageFromStringOrFunction(mutation.meta?.errorMessage, error);
      let text = "An unknown error occurred. This is a bug. Please report it to the developers!";
      if (error instanceof ApiError) {
        text = error.message + (error.body ? ": " + error.body : "");
      }
      store.dispatch(
        CRUDDialogActions.openSnackbar({
          text,
          title,
          severity: "error",
        }),
      );
    },
    onSuccess: (data, _variables, _context, mutation) => {
      const text = messageFromStringOrFunction(mutation.meta?.successMessage, data);
      if (text === undefined) {
        return;
      }
      store.dispatch(
        CRUDDialogActions.openSnackbar({
          text,
          severity: "success",
        }),
      );
    },
  }),
});

export default queryClient;
