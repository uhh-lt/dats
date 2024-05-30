import { useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import { SnackbarEvent } from "./SnackbarEvent.ts";

export const useOpenSnackbar = () => {
  const dispatch = useAppDispatch();

  const openSnackbar = useCallback(
    (data: SnackbarEvent) => {
      dispatch(CRUDDialogActions.openSnackbar(data));
    },
    [dispatch],
  );

  return openSnackbar;
};
