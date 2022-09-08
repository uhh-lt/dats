import { MutationCache, QueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../features/snackbar/SnackbarAPI";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      SnackbarAPI.openSnackbar({
        // @ts-ignore
        text: error.message,
        severity: "error",
      });
    },
  }),
});

export default queryClient;
