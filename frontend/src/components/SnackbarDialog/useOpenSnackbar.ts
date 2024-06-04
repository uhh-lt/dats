import { useCallback } from "react";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
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
