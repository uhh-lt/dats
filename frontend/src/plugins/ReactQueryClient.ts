import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/openapi/core/ApiError.ts";
import { CRUDDialogActions } from "../store/dialogSlice.ts";
import { store } from "../store/store.ts";

function messageFromStringOrFunction(input: unknown, data: unknown, variables: unknown): string | undefined {
  if (typeof input === "string") {
    return input;
  } else if (typeof input === "function") {
    return input(data, variables) as string;
  } else {
    return;
  }
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, variables, _context, mutation) => {
      console.log("--- An unexpected error occured ---");
      console.log(error);
      console.log(variables);
      console.log(_context);
      console.log(mutation);
      console.log("-----------------------------------");
      const title = messageFromStringOrFunction(mutation.meta?.errorMessage, error, variables);
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
    onSuccess: (data, variables, _context, mutation) => {
      const text = messageFromStringOrFunction(mutation.meta?.successMessage, data, variables);
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
