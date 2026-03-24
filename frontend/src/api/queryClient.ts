import { ApiError } from "@api/core/ApiError";
// eslint-disable-next-line boundaries/element-types
import { SnackbarActions } from "@core/notification";
import { store } from "@store/store";
import { MutationCache, QueryClient } from "@tanstack/react-query";

function messageFromStringOrFunction(input: unknown, data: unknown, variables: unknown): string | undefined {
  if (typeof input === "string") {
    return input;
  } else if (typeof input === "function") {
    return input(data, variables) as string;
  } else {
    return;
  }
}

function renderRecordToString(record: Record<string, unknown>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
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
        text = error.message + (error.body ? ": " + renderRecordToString(error.body) : "");
      }
      store.dispatch(
        SnackbarActions.openSnackbar({
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
        SnackbarActions.openSnackbar({
          text,
          severity: "success",
        }),
      );
    },
  }),
});
