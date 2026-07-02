import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { ConfirmationEvent } from "./_types/ConfirmationEvent";
import { ConfirmationActions } from "./confirmationSlice";

export const useOpenConfirmationDialog = () => {
  const dispatch = useAppDispatch();

  const openConfirmationDialog = useCallback(
    (data: ConfirmationEvent) => {
      dispatch(ConfirmationActions.openConfirmationDialog(data));
    },
    [dispatch],
  );

  return openConfirmationDialog;
};
