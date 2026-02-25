import { useAppDispatch } from "@plugins/redux";
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
