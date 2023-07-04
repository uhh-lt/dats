import { MutationCache, QueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../features/Snackbar/SnackbarAPI";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      SnackbarAPI.openSnackbar({
        // @ts-ignore
        text: error.message + (error.body.detail ? ": " + error.body.detail : ""),
        severity: "error",
      });
    },
  }),
});

export default queryClient;
