import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { SnackbarEvent } from "./_types/SnackbarEvent";
import { SnackbarActions } from "./snackbarSlice";

export const useOpenSnackbar = () => {
  const dispatch = useAppDispatch();

  const openSnackbar = useCallback(
    (data: SnackbarEvent) => {
      dispatch(SnackbarActions.openSnackbar(data));
    },
    [dispatch],
  );

  return openSnackbar;
};
